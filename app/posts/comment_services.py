# posts/comment_services.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from posts.models import PostComment


async def add_comment(
    db: AsyncSession,
    post_id,
    user_id,
    content: str,
):
    comment = PostComment(
        post_id=post_id,
        user_id=user_id,
        content=content,
    )

    db.add(comment)
    await db.commit()
    await db.refresh(comment)
    return comment


async def get_comments(
    db: AsyncSession,
    post_id,
    limit: int = 50,
):
    stmt = (
        select(PostComment)
        .where(PostComment.post_id == post_id)
        .order_by(PostComment.created_at.asc())
        .limit(limit)
    )

    result = await db.execute(stmt)
    return result.scalars().all()
