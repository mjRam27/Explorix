# app/posts/routes.py
from fastapi import APIRouter, Depends, Body, Query
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

from db.postgres import get_db
from core.dependencies import get_current_user
from posts.service import (
    create_post,
    get_my_posts,
    get_user_posts
)

router = APIRouter(prefix="/posts", tags=["Posts"])

@router.post("/")
async def create(
    content: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user)
):
    return await create_post(db, user.id, content)

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
