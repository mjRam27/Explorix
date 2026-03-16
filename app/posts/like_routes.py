# posts/like_routes.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from db.postgres import get_db
from core.dependencies import get_current_user
from posts.like_service import toggle_like

router = APIRouter(prefix="/posts", tags=["Post Likes"])


@router.post("/{post_id}/like")
async def like_unlike_post(
    post_id: str,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    return await toggle_like(db, post_id, user.id)
