# posts/social_service.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from fastapi import HTTPException

from posts.models import PostLike, PostSave, PostComment


# =========================
# LIKES
# =========================
async def like_post(db: AsyncSession, post_id, user_id):
    exists = await db.scalar(
        select(PostLike).where(
            PostLike.post_id == post_id,
            PostLike.user_id == user_id,
        )
    )
    if exists:
        return

    db.add(PostLike(post_id=post_id, user_id=user_id))
    await db.commit()


async def unlike_post(db: AsyncSession, post_id, user_id):
    await db.execute(
        delete(PostLike).where(
            PostLike.post_id == post_id,
            PostLike.user_id == user_id,
        )
    )
    await db.commit()


# =========================
# SAVES (NEXT STOP)
# =========================
async def save_post(db: AsyncSession, post_id, user_id):
    exists = await db.scalar(
        select(PostSave).where(
            PostSave.post_id == post_id,
            PostSave.user_id == user_id,
        )
    )
    if exists:
        return

    db.add(PostSave(post_id=post_id, user_id=user_id))
    await db.commit()


async def unsave_post(db: AsyncSession, post_id, user_id):
    await db.execute(
        delete(PostSave).where(
            PostSave.post_id == post_id,
            PostSave.user_id == user_id,
        )
    )
    await db.commit()


# =========================
# COMMENTS
# =========================
async def add_comment(db: AsyncSession, post_id, user_id, content: str):
    if not content.strip():
        raise HTTPException(400, "Comment cannot be empty")

    comment = PostComment(
        post_id=post_id,
        user_id=user_id,
        content=content,
    )
    db.add(comment)
    await db.commit()
    await db.refresh(comment)
    return comment


async def get_comments(db: AsyncSession, post_id, limit: int = 50):
    result = await db.execute(
        select(PostComment)
        .where(PostComment.post_id == post_id)
        .order_by(PostComment.created_at.asc())
        .limit(limit)
    )
    return result.scalars().all()
