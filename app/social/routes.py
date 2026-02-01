# app/social/routes.py

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

from db.postgres import get_db
from core.dependencies import get_current_user
from posts.feed_service import get_following_feed
from social.service import (
    follow_user,
    unfollow_user,
    get_discovery_feed
)

router = APIRouter(prefix="/social", tags=["Social"])


# 🔹 Follow user
@router.post("/follow/{user_id}")
async def follow(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user)
):
    await follow_user(db, user.id, user_id)
    return {"status": "followed"}


# 🔹 Unfollow user
@router.post("/unfollow/{user_id}")
async def unfollow(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user)
):
    await unfollow_user(db, user.id, user_id)
    return {"status": "unfollowed"}


# 🔹 Main feed (aggregated: posts + likes + saves)
@router.get("/feed")
async def feed(
    cursor: datetime | None = Query(None),
    limit: int = Query(20, le=50),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    return await get_following_feed(
        db=db,
        current_user_id=user.id,
        cursor=cursor,
        limit=limit,
    )


# 🔹 Discovery feed (country-based)
@router.get("/discover")
async def discover_feed(
    limit: int = Query(20, le=50),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user)
):
    return await get_discovery_feed(db, user.country_code, limit)
