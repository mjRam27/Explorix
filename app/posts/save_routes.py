from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from db.postgres import get_db
from core.dependencies import get_current_user
from posts.save_service import toggle_save, get_saved_posts

router = APIRouter(prefix="/posts", tags=["Post Saves"])


@router.post("/{post_id}/save")
async def save_unsave_post(
    post_id: str,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    return await toggle_save(db, post_id, user.id)


@router.get("/saved")
async def my_saved_posts(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    return await get_saved_posts(db, user.id)
