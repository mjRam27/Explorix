# app/users/service.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from auth.models import User
from posts.models import Post
from social.models import UserFollow
from schemas.user_profile import UpdateProfileRequest
from utils.gcs import get_signed_url

async def get_my_profile(db: AsyncSession, user_id):
    followers = await db.scalar(
        select(func.count()).where(UserFollow.following_id == user_id)
    )

    following = await db.scalar(
        select(func.count()).where(UserFollow.follower_id == user_id)
    )

    posts = await db.scalar(
        select(func.count()).where(Post.user_id == user_id)
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
    }


async def get_public_profile(db: AsyncSession, viewer_id, profile_user_id):
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
        user.name = data.name

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
