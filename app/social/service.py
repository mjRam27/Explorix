# app/social/service.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from fastapi import HTTPException

from social.models import UserFollow
from posts.models import Post
from auth.models import User


async def follow_user(db: AsyncSession, follower_id, following_id):
    if follower_id == following_id:
        raise HTTPException(400, "Cannot follow yourself")

    exists = await db.scalar(
        select(func.count()).where(
            UserFollow.follower_id == follower_id,
            UserFollow.following_id == following_id
        )
    )

    if exists:
        return

    db.add(UserFollow(
        follower_id=follower_id,
        following_id=following_id
    ))

    await db.commit()


async def unfollow_user(db: AsyncSession, follower_id, following_id):
    await db.execute(
        delete(UserFollow).where(
            UserFollow.follower_id == follower_id,
            UserFollow.following_id == following_id
        )
    )
    await db.commit()



async def get_feed(db: AsyncSession, user_id, cursor=None, limit=20):
    stmt = (
        select(Post)
        .join(UserFollow, Post.user_id == UserFollow.following_id)
        .where(UserFollow.follower_id == user_id)
        .order_by(Post.created_at.desc())
        .limit(limit)
    )

    if cursor:
        stmt = stmt.where(Post.created_at < cursor)

    result = await db.execute(stmt)
    return result.scalars().all()


async def get_discovery_feed(db: AsyncSession, country_code, limit=20):
    result = await db.execute(
        select(Post)
        .join(User, Post.user_id == User.id)
        .where(User.country_code == country_code)
        .order_by(Post.created_at.desc())
        .limit(limit)
    )
    return result.scalars().all()
