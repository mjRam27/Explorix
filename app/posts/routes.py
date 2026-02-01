from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
from pydantic import BaseModel

from db.postgres import get_db
from core.dependencies import get_current_user
from posts.service import (
    create_post,
    get_my_posts,
    get_user_posts
)

router = APIRouter(prefix="/posts", tags=["Posts"])


class CreatePostRequest(BaseModel):
    media_url: str
    media_type: str
    category: str
    caption: str | None = None
    location_name: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    has_audio: str | None = None


@router.post("/")
async def create(
    payload: CreatePostRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user)
):
    return await create_post(
        db=db,
        user_id=user.id,
        media_url=payload.media_url,
        media_type=payload.media_type,
        category=payload.category,
        caption=payload.caption,
        location_name=payload.location_name,
        latitude=payload.latitude,
        longitude=payload.longitude,
        has_audio=payload.has_audio,
    )


@router.get("/me")
async def my_posts(
    cursor: datetime | None = Query(None),
    limit: int = Query(20, le=50),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user)
):
    return await get_my_posts(db, user.id, cursor, limit)


@router.get("/user/{user_id}")
async def user_posts(
    user_id: str,
    cursor: datetime | None = Query(None),
    limit: int = Query(20, le=50),
    db: AsyncSession = Depends(get_db)
):
    return await get_user_posts(db, user_id, cursor, limit)
