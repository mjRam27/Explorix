# app/users/routes.py

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from db.postgres import get_db
from core.dependencies import get_current_user
from user.service import (
    get_my_profile,
    get_public_profile,
    update_my_profile,
    search_users_by_name,
    list_followers,
    list_following,
)
from db.db_redis import cache_json, get_cached_json, delete_keys_by_prefix
from schemas.user_profile import UpdateProfileRequest
from itinerary.models import Itinerary
from itinerary.service import ItineraryService

router = APIRouter(prefix="/users", tags=["Users"])
itinerary_service = ItineraryService()


# 🔹 My profile (private)
@router.get("/me")
async def my_profile(
    refresh: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user)
):
    cache_key = f"user_me:{user.id}"
    if not refresh:
        cached = get_cached_json(cache_key)
        if cached:
            return cached
    profile = await get_my_profile(db, user.id)
    cache_json(cache_key, profile, ttl=180)
    return profile


# 🔹 Update my profile
@router.put("/me")
async def edit_my_profile(
    payload: UpdateProfileRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user)
):
    try:
        profile = await update_my_profile(db, user.id, payload)
    except ValueError as exc:
        raise HTTPException(400, str(exc))
    if not profile:
        raise HTTPException(404, "User not found")
    delete_keys_by_prefix(f"user_me:{user.id}")
    return profile


@router.get("/search")
async def search_users(
    q: str,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    return {"items": await search_users_by_name(db, q, limit, exclude_user_id=user.id)}


@router.get("/{user_id}/followers")
async def followers(
    user_id: str,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    return {"items": await list_followers(db, user_id, user.id, limit)}


@router.get("/{user_id}/following")
async def following(
    user_id: str,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    return {"items": await list_following(db, user_id, user.id, limit)}


@router.get("/{user_id}/itineraries/past")
async def public_past_itineraries(
    user_id: str,
    limit: int = 30,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    stmt = (
        select(Itinerary)
        .where(
            Itinerary.user_id == user_id,
            Itinerary.end_date < date.today(),
        )
        .order_by(Itinerary.end_date.desc())
        .limit(max(1, min(limit, 100)))
    )
    items = (await db.execute(stmt)).scalars().all()
    enriched_items = []
    for i in items:
        enriched = await itinerary_service.enrich_itinerary(db, i)
        enriched_items.append(
            {
                "id": str(i.id),
                "title": i.title,
                "destination": i.destination,
                "start_date": i.start_date.isoformat(),
                "end_date": i.end_date.isoformat(),
                "status": i.status,
                "days": enriched.get("days", []),
            }
        )
    return {"items": enriched_items}


@router.get("/{user_id}/itineraries")
async def public_itineraries(
    user_id: str,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    stmt = (
        select(Itinerary)
        .where(Itinerary.user_id == user_id)
        .order_by(Itinerary.start_date.desc())
        .limit(max(1, min(limit, 100)))
    )
    items = (await db.execute(stmt)).scalars().all()
    enriched_items = []
    for i in items:
        enriched = await itinerary_service.enrich_itinerary(db, i)
        enriched_items.append(
            {
                "id": str(i.id),
                "title": i.title,
                "destination": i.destination,
                "start_date": i.start_date.isoformat(),
                "end_date": i.end_date.isoformat(),
                "status": i.status,
                "days": enriched.get("days", []),
            }
        )
    return {"items": enriched_items}


# 🔹 Public profile (Instagram-style)
@router.get("/{user_id}")
async def public_profile(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user)
):
    profile = await get_public_profile(db, user.id, user_id)
    if not profile:
        raise HTTPException(404, "User not found")
    return profile
