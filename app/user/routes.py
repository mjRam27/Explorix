# app/users/routes.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from db.postgres import get_db
from core.dependencies import get_current_user
from user.service import (
    get_my_profile,
    get_public_profile,
    update_my_profile
)
from db.db_redis import cache_json, get_cached_json, delete_keys_by_prefix
from schemas.user_profile import UpdateProfileRequest

router = APIRouter(prefix="/users", tags=["Users"])


# 🔹 My profile (private)
@router.get("/me")
async def my_profile(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user)
):
    cache_key = f"user_me:{user.id}"
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
    profile = await update_my_profile(db, user.id, payload)
    if not profile:
        raise HTTPException(404, "User not found")
    delete_keys_by_prefix(f"user_me:{user.id}")
    return profile


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
