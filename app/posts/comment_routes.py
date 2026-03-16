# posts/comment_routes.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from db.postgres import get_db
from core.dependencies import get_current_user
from posts.comment_service import add_comment, get_comments

router = APIRouter(prefix="/posts", tags=["Post Comments"])


@router.post("/{post_id}/comment")
async def comment_on_post(
    post_id: str,
    content: str,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    return await add_comment(db, post_id, user.id, content)


@router.get("/{post_id}/comments")
async def list_comments(
    post_id: str,
    limit: int = Query(50, le=100),
    db: AsyncSession = Depends(get_db),
):
    return await get_comments(db, post_id, limit)
