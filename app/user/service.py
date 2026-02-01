# app/users/service.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from auth.models import User
from posts.models import Post
from social.models import UserFollow
from schemas.user_profile import UpdateProfileRequest

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

    return {
        "id": str(user.id),
        "name": user.name,
        "email": user.email,
        "country_code": user.country_code,
        "followers": followers,
        "following": following,
        "posts": posts
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

    return {
        "id": str(user.id),
        "name": user.name,
        "country_code": user.country_code,
        "followers": followers,
        "following": following,
        "posts": posts,
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

    await db.commit()
    await db.refresh(user)

    return {
        "id": str(user.id),
        "name": user.name,
        "email": user.email,
        "country_code": user.country_code
    }
