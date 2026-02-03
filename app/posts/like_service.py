# posts/like_service.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from posts.models import PostLike


async def toggle_like(
    db: AsyncSession,
    post_id,
    user_id,
):
    stmt = select(PostLike).where(
        PostLike.post_id == post_id,
        PostLike.user_id == user_id,
    )

    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()

    if existing:
        await db.execute(
            delete(PostLike).where(PostLike.id == existing.id)
        )
        await db.commit()
        return {"liked": False}

    like = PostLike(
        post_id=post_id,
        user_id=user_id,
    )
    db.add(like)
    await db.commit()
    return {"liked": True}
