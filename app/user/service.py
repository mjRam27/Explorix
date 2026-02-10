# app/users/service.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from auth.models import User
from posts.models import Post
from social.models import UserFollow
from itinerary.models import Itinerary
from schemas.user_profile import UpdateProfileRequest
from utils.gcs import get_signed_url
from datetime import date

async def get_my_profile(db: AsyncSession, user_id):
    # Count travelled as distinct countries (derived from destination suffix after last comma).
    country_expr = func.lower(
        func.trim(
            func.regexp_replace(Itinerary.destination, r"^.*,\s*", "")
        )
    )

    followers = await db.scalar(
        select(func.count()).where(UserFollow.following_id == user_id)
    )

    following = await db.scalar(
        select(func.count()).where(UserFollow.follower_id == user_id)
    )

    posts = await db.scalar(
        select(func.count()).where(Post.user_id == user_id)
    )
    travelled = await db.scalar(
        select(func.count(func.distinct(country_expr))).where(
            Itinerary.user_id == user_id,
            Itinerary.end_date < date.today(),
            Itinerary.destination.isnot(None),
            Itinerary.destination != "",
        )
    )

    user = await db.get(User, user_id)

    avatar_url = user.avatar_url
    if avatar_url and not avatar_url.startswith("http"):
        avatar_url = get_signed_url(avatar_url)

    return {
        "id": str(user.id),
        "name": user.name,
        "email": user.email,
        "country_code": user.country_code,
        "bio": user.bio,
        "avatar_url": avatar_url,
        "followers": followers,
        "following": following,
        "posts": posts,
        "followers_count": followers,
        "following_count": following,
        "posts_count": posts,
        "travelled_count": travelled or 0,
    }


async def get_public_profile(db: AsyncSession, viewer_id, profile_user_id):
    # Count travelled as distinct countries (derived from destination suffix after last comma).
    country_expr = func.lower(
        func.trim(
            func.regexp_replace(Itinerary.destination, r"^.*,\s*", "")
        )
    )

    user = await db.get(User, profile_user_id)
    if not user:
        return None

    followers = await db.scalar(
        select(func.count()).where(UserFollow.following_id == profile_user_id)
    )

    following = await db.scalar(
        select(func.count()).where(UserFollow.follower_id == profile_user_id)
    )

    posts = await db.scalar(
        select(func.count()).where(Post.user_id == profile_user_id)
    )
    travelled = await db.scalar(
        select(func.count(func.distinct(country_expr))).where(
            Itinerary.user_id == profile_user_id,
            Itinerary.end_date < date.today(),
            Itinerary.destination.isnot(None),
            Itinerary.destination != "",
        )
    )

    is_following = await db.scalar(
        select(func.count()).where(
            UserFollow.follower_id == viewer_id,
            UserFollow.following_id == profile_user_id
        )
    )

    avatar_url = user.avatar_url
    if avatar_url and not avatar_url.startswith("http"):
        avatar_url = get_signed_url(avatar_url)

    return {
        "id": str(user.id),
        "name": user.name,
        "country_code": user.country_code,
        "bio": user.bio,
        "avatar_url": avatar_url,
        "followers": followers,
        "following": following,
        "posts": posts,
        "followers_count": followers,
        "following_count": following,
        "posts_count": posts,
        "travelled_count": travelled or 0,
        "is_following": is_following > 0
    }


async def update_my_profile(
    db: AsyncSession,
    user_id,
    data: UpdateProfileRequest
):
    user = await db.get(User, user_id)
    if not user:
        return None

    if data.name is not None:
        normalized_name = data.name.strip()
        if normalized_name:
            duplicate = await db.scalar(
                select(func.count()).where(
                    func.lower(User.name) == normalized_name.lower(),
                    User.id != user_id,
                )
            )
            if duplicate:
                raise ValueError("Username already taken")
            user.name = normalized_name
        else:
            user.name = None

    if data.country_code is not None:
        user.country_code = data.country_code
    if data.bio is not None:
        user.bio = data.bio
    if data.avatar_url is not None:
        user.avatar_url = data.avatar_url

    await db.commit()
    await db.refresh(user)

    return {
        "id": str(user.id),
        "name": user.name,
        "email": user.email,
        "country_code": user.country_code,
        "bio": user.bio,
        "avatar_url": user.avatar_url,
    }


async def search_users_by_name(
    db: AsyncSession,
    q: str,
    limit: int = 20,
    exclude_user_id=None,
):
    query = (q or "").strip()
    if len(query) < 2:
        return []

    stmt = (
        select(User)
        .where(User.name.is_not(None))
        .where(func.lower(User.name).like(f"%{query.lower()}%"))
    )
    if exclude_user_id:
        stmt = stmt.where(User.id != exclude_user_id)
    stmt = stmt.order_by(User.name.asc()).limit(max(1, min(limit, 50)))
    users = (await db.execute(stmt)).scalars().all()

    results = []
    for user in users:
        avatar_url = user.avatar_url
        if avatar_url and not avatar_url.startswith("http"):
            avatar_url = get_signed_url(avatar_url)

        results.append(
            {
                "id": str(user.id),
                "name": user.name,
                "avatar_url": avatar_url,
            }
        )
    return results


async def list_followers(db: AsyncSession, profile_user_id, viewer_id, limit: int = 50):
    stmt = (
        select(User, UserFollow.follower_id)
        .join(UserFollow, UserFollow.follower_id == User.id)
        .where(UserFollow.following_id == profile_user_id)
        .order_by(User.name.asc())
        .limit(max(1, min(limit, 100)))
    )
    rows = (await db.execute(stmt)).all()

    items = []
    for user, follower_id in rows:
        avatar_url = user.avatar_url
        if avatar_url and not avatar_url.startswith("http"):
            avatar_url = get_signed_url(avatar_url)

        is_following = await db.scalar(
            select(func.count()).where(
                UserFollow.follower_id == viewer_id,
                UserFollow.following_id == follower_id,
            )
        )
        items.append(
            {
                "id": str(user.id),
                "name": user.name,
                "avatar_url": avatar_url,
                "is_following": bool(is_following),
            }
        )
    return items


async def list_following(db: AsyncSession, profile_user_id, viewer_id, limit: int = 50):
    stmt = (
        select(User, UserFollow.following_id)
        .join(UserFollow, UserFollow.following_id == User.id)
        .where(UserFollow.follower_id == profile_user_id)
        .order_by(User.name.asc())
        .limit(max(1, min(limit, 100)))
    )
    rows = (await db.execute(stmt)).all()

    items = []
    for user, following_id in rows:
        avatar_url = user.avatar_url
        if avatar_url and not avatar_url.startswith("http"):
            avatar_url = get_signed_url(avatar_url)

        is_following = await db.scalar(
            select(func.count()).where(
                UserFollow.follower_id == viewer_id,
                UserFollow.following_id == following_id,
            )
        )
        items.append(
            {
                "id": str(user.id),
                "name": user.name,
                "avatar_url": avatar_url,
                "is_following": bool(is_following),
            }
        )
    return items
