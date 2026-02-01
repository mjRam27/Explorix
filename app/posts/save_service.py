from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from posts.models import PostSave


async def toggle_save(
    db: AsyncSession,
    post_id,
    user_id,
):
    stmt = select(PostSave).where(
        PostSave.post_id == post_id,
        PostSave.user_id == user_id,
    )

    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()

    if existing:
        await db.execute(
            delete(PostSave).where(PostSave.id == existing.id)
        )
        await db.commit()
        return {"saved": False}

    save = PostSave(
        post_id=post_id,
        user_id=user_id,
    )
    db.add(save)
    await db.commit()
    return {"saved": True}


async def get_saved_posts(
    db: AsyncSession,
    user_id,
):
    stmt = (
        select(PostSave)
        .where(PostSave.user_id == user_id)
        .order_by(PostSave.created_at.desc())
    )

    result = await db.execute(stmt)
    return result.scalars().all()
