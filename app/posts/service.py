from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from posts.models import Post


async def create_post(
    db: AsyncSession,
    user_id,
    media_url: str,
    media_type: str,
    category: str,
    caption: str | None = None,
    location_name: str | None = None,
    latitude: float | None = None,
    longitude: float | None = None,
    has_audio: str | None = None,
) -> Post:
    post = Post(
        user_id=user_id,
        media_url=media_url,
        media_type=media_type,
        category=category,
        caption=caption,
        location_name=location_name,
        latitude=latitude,
        longitude=longitude,
        has_audio=has_audio,
    )

    db.add(post)
    await db.commit()
    await db.refresh(post)
    return post


async def get_my_posts(
    db: AsyncSession,
    user_id,
    cursor: datetime | None = None,
    limit: int = 20
):
    stmt = (
        select(Post)
        .where(Post.user_id == user_id)
        .order_by(Post.created_at.desc())
        .limit(limit)
    )

    if cursor:
        stmt = stmt.where(Post.created_at < cursor)

    result = await db.execute(stmt)
    return result.scalars().all()


async def get_user_posts(
    db: AsyncSession,
    user_id,
    cursor: datetime | None = None,
    limit: int = 20
):
    stmt = (
        select(Post)
        .where(Post.user_id == user_id)
        .order_by(Post.created_at.desc())
        .limit(limit)
    )

    if cursor:
        stmt = stmt.where(Post.created_at < cursor)

    result = await db.execute(stmt)
    return result.scalars().all()
