# posts/save_routes.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from db.postgres import get_db
from core.dependencies import get_current_user
from posts.save_service import toggle_save, get_saved_posts_enriched
from db.db_redis import cache_json, get_cached_json, delete_keys_by_prefix

router = APIRouter(prefix="/posts", tags=["Post Saves"])


@router.post("/{post_id}/save")
async def save_unsave_post(
    post_id: str,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    result = await toggle_save(db, post_id, user.id)
    delete_keys_by_prefix(f"saved_posts:{user.id}:")
    delete_keys_by_prefix(f"feed:{user.id}:")
    return result


@router.get("/saved")
async def my_saved_posts(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    cache_key = f"saved_posts:{user.id}"
    cached = get_cached_json(cache_key)
    if cached:
        return cached

    result = await get_saved_posts_enriched(db, user.id)
    cache_json(cache_key, result, ttl=180)
    return result
