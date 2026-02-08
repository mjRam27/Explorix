# app/itinerary/routes.py

from fastapi import APIRouter, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from uuid import UUID

from db.postgres import get_db
from db.db_redis import cache_json, get_cached_json, delete_keys_by_prefix
from schemas.itinerary import (
    ItineraryCreateRequest,
    ItineraryResponse,
    ItineraryUpdateRequest
)
from schemas.itinerary_read import ItineraryEnrichedResponse
from itinerary.service import ItineraryService

from itinerary.models import Itinerary
from core.dependencies import get_current_user
from schemas.itinerary_draft import ItineraryDraftRequest
from schemas.itinerary_auto import ItineraryAutoRequest, ItineraryAutoNearbyRequest
from schemas.itinerary_next_stop import NextStopItem
router = APIRouter(prefix="/itinerary", tags=["Itinerary"])
service = ItineraryService()
NEXT_STOPS_TTL_SECONDS = 60 * 60 * 24 * 7

STYLE_SCORE_COLUMN = {
    "adventurous": "adventure_score",
    "relaxing": "relaxing_score",
    "fun": "fun_score",
}

MAIN_CATEGORIES = {
    "food",
    "services",
    "nature",
    "culture",
    "shopping",
    "stay",
    "entertainment",
    "sports",
}

SUBCATEGORY_MAIN_CATEGORY_MAP = {
    "events": "entertainment",
    "nightlife": "entertainment",
    "wellness": "stay",
    "normal": "services",
}


def _split_categories(raw: str | None) -> tuple[list[str], list[str]]:
    if not raw:
        return [], []

    canonical: list[str] = []
    keywords: list[str] = []
    for token in [c.strip().lower() for c in raw.split(",") if c.strip()]:
        mapped = SUBCATEGORY_MAIN_CATEGORY_MAP.get(token, token)
        if mapped in MAIN_CATEGORIES:
            canonical.append(mapped)
        else:
            keywords.append(token)
    return canonical, keywords


def _score_column_for_nearby(canonical: list[str], keywords: list[str]) -> str:
    pool = set(canonical + keywords)
    if {"nature", "sports", "hike", "adventure"} & pool:
        return "adventure_score"
    if {"stay", "food", "wellness", "spa"} & pool:
        return "relaxing_score"
    return "fun_score"


@router.post("/", response_model=ItineraryResponse)
async def create_manual(
    req: ItineraryCreateRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user)
):
    itinerary = await service.create_manual(db, user.id, req)
    delete_keys_by_prefix(f"itinerary:{user.id}:")
    return itinerary



@router.get("/my")
async def my_itineraries(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user)
):
    cache_key = f"itinerary:{user.id}:list"
    cached = get_cached_json(cache_key)
    if cached is not None:
        return cached

    stmt = select(Itinerary).where(Itinerary.user_id == user.id)
    result = await db.execute(stmt)
    data = result.scalars().all()
    encoded = jsonable_encoder(data)
    cache_json(cache_key, encoded, ttl=180)
    return encoded


@router.post("/add")
async def add_itinerary_from_draft(
    req: ItineraryDraftRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user)
):
    itinerary = await service.save_from_draft(
        db=db,
        user_id=user.id,
        draft=req.draft
    )
    delete_keys_by_prefix(f"itinerary:{user.id}:")

    return {
        "id": str(itinerary.id),
        "status": "saved"
    }


@router.get("/next-stops")
async def get_next_stops(
    user=Depends(get_current_user),
):
    cache_key = f"itinerary:{user.id}:next_stops"
    cached = get_cached_json(cache_key)
    if cached is None:
        return []
    return cached


@router.post("/next-stops")
async def add_next_stop(
    req: NextStopItem,
    user=Depends(get_current_user),
):
    cache_key = f"itinerary:{user.id}:next_stops"
    existing = get_cached_json(cache_key)
    current = existing if isinstance(existing, list) else []
    deduped = [item for item in current if item.get("id") != req.id]
    next_list = [req.model_dump()] + deduped
    cache_json(cache_key, next_list, ttl=NEXT_STOPS_TTL_SECONDS)
    return next_list


@router.delete("/next-stops/{stop_id}")
async def remove_next_stop(
    stop_id: int,
    user=Depends(get_current_user),
):
    cache_key = f"itinerary:{user.id}:next_stops"
    existing = get_cached_json(cache_key)
    current = existing if isinstance(existing, list) else []
    next_list = [item for item in current if item.get("id") != stop_id]
    cache_json(cache_key, next_list, ttl=NEXT_STOPS_TTL_SECONDS)
    return next_list


@router.post("/auto")
async def auto_itinerary(
    req: ItineraryAutoRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user)
):
    limit = max(3, min(60, req.days * 3))
    score_column = STYLE_SCORE_COLUMN.get(req.style, "fun_score")

    sql = f"""
    SELECT
        id,
        title,
        category
    FROM poi
    WHERE (
        city ILIKE :destination
        OR state ILIKE :destination
        OR country_code ILIKE :destination_cc
    )
    """

    params = {
        "destination": f"%{req.destination}%",
        "destination_cc": req.destination.upper(),
        "limit": limit,
    }
    canonical_categories, keyword_filters = _split_categories(req.category)
    if canonical_categories:
        sql += " AND main_category = ANY(:main_categories)"
        params["main_categories"] = canonical_categories

    if keyword_filters:
        sql += " AND (" + " OR ".join(
            [f"category ILIKE :cat{i}" for i in range(len(keyword_filters))]
        ) + ")"
        for i, token in enumerate(keyword_filters):
            params[f"cat{i}"] = f"%{token}%"

    sql += f"""
    ORDER BY
        COALESCE({score_column}, 0) DESC,
        COALESCE(rating, 0) DESC,
        COALESCE(reviews_count, 0) DESC
    LIMIT :limit
    """

    result = await db.execute(text(sql), params)
    places = result.fetchall()

    if not places:
        fallback_sql = f"""
        SELECT id, title, category
        FROM poi
        ORDER BY
            COALESCE({score_column}, 0) DESC,
            COALESCE(rating, 0) DESC,
            COALESCE(reviews_count, 0) DESC
        LIMIT :limit
        """
        fallback_result = await db.execute(text(fallback_sql), {"limit": limit})
        places = fallback_result.fetchall()

    slots = ["morning", "afternoon", "evening"]
    days = []
    for day_index in range(req.days):
        days.append({
            "day": day_index + 1,
            "slots": {
                "morning": [],
                "afternoon": [],
                "evening": [],
            },
        })

    for idx, row in enumerate(places):
        day_idx = idx // 3
        if day_idx >= req.days:
            break
        slot = slots[idx % 3]
        days[day_idx]["slots"][slot].append({
            "place_id": row.id,
            "name": row.title,
            "category": row.category,
        })

    return {
        "destination": req.destination,
        "days": days,
        "travel_style": req.style,
        "selected_categories": [c.strip() for c in (req.category or "").split(",") if c.strip()],
        "created_by": "backend_auto",
        "editable": True,
    }


@router.post("/auto/nearby")
async def auto_itinerary_nearby(
    req: ItineraryAutoNearbyRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user)
):
    limit = max(3, min(60, req.days * 3))
    canonical_categories, keyword_filters = _split_categories(req.category)
    score_column = STYLE_SCORE_COLUMN.get(req.style, "fun_score")

    sql = f"""
    SELECT
        id,
        title,
        category,
        city,
        state,
        country_code,
        ST_Y(geo::geometry) AS latitude,
        ST_X(geo::geometry) AS longitude
    FROM poi
    WHERE geo IS NOT NULL
      AND ST_DWithin(
          geo,
          ST_MakePoint(:lon, :lat)::geography,
          :radius
      )
    """

    params = {
        "lat": req.lat,
        "lon": req.lon,
        "radius": req.radius_km * 1000,
        "limit": limit,
    }

    if canonical_categories:
        sql += " AND main_category = ANY(:main_categories)"
        params["main_categories"] = canonical_categories

    if keyword_filters:
        sql += " AND (" + " OR ".join(
            [f"category ILIKE :cat{i}" for i in range(len(keyword_filters))]
        ) + ")"
        for i, cat in enumerate(keyword_filters):
            params[f"cat{i}"] = f"%{cat}%"

    sql += f"""
    ORDER BY
        COALESCE({score_column}, 0) DESC,
        COALESCE(rating, 0) DESC,
        COALESCE(reviews_count, 0) DESC
    LIMIT :limit
    """
    result = await db.execute(text(sql), params)
    rows = result.fetchall()

    slots = ["morning", "afternoon", "evening"]
    days = []
    for day_index in range(req.days):
        days.append({
            "day": day_index + 1,
            "slots": {
                "morning": [],
                "afternoon": [],
                "evening": [],
            },
        })

    for idx, row in enumerate(rows):
        day_idx = idx // 3
        if day_idx >= req.days:
            break
        slot = slots[idx % 3]
        days[day_idx]["slots"][slot].append({
            "place_id": row.id,
            "name": row.title,
            "category": row.category,
        })

    destination_label = "Nearby"
    if rows:
        first = rows[0]
        city = (first.city or first.state or "").strip() if hasattr(first, "city") else ""
        cc = (first.country_code or "").strip() if hasattr(first, "country_code") else ""
        if city and cc:
            destination_label = f"{city}, {cc}"
        elif city:
            destination_label = city
        elif cc:
            destination_label = cc

    return {
        "destination": destination_label,
        "days": days,
        "travel_style": req.style,
        "selected_categories": [c.strip() for c in (req.category or "").split(",") if c.strip()],
        "created_by": "backend_nearby",
        "editable": True,
    }


@router.get("/{itinerary_id}", response_model=ItineraryEnrichedResponse)
async def get_itinerary_by_id(
    itinerary_id: UUID,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    cache_key = f"itinerary:{user.id}:{itinerary_id}"
    cached = get_cached_json(cache_key)
    if cached is not None:
        return cached

    stmt = select(Itinerary).where(
        Itinerary.id == itinerary_id,
        Itinerary.user_id == user.id
    )
    result = await db.execute(stmt)
    itinerary = result.scalar_one_or_none()

    if not itinerary:
        raise HTTPException(status_code=404, detail="Itinerary not found")

    enriched = await service.enrich_itinerary(db, itinerary)
    cache_json(cache_key, enriched, ttl=180)
    return enriched


@router.delete("/{itinerary_id}")
async def delete_itinerary(
    itinerary_id: UUID,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    stmt = select(Itinerary).where(
        Itinerary.id == itinerary_id,
        Itinerary.user_id == user.id
    )
    result = await db.execute(stmt)
    itinerary = result.scalar_one_or_none()

    if not itinerary:
        raise HTTPException(status_code=404, detail="Itinerary not found")

    await db.delete(itinerary)
    await db.commit()
    delete_keys_by_prefix(f"itinerary:{user.id}:")

    return {"status": "deleted"}


@router.patch("/{itinerary_id}", response_model=ItineraryResponse)
async def update_itinerary(
    itinerary_id: UUID,
    req: ItineraryUpdateRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    stmt = select(Itinerary).where(
        Itinerary.id == itinerary_id,
        Itinerary.user_id == user.id
    )
    result = await db.execute(stmt)
    itinerary = result.scalar_one_or_none()

    if not itinerary:
        raise HTTPException(status_code=404, detail="Itinerary not found")

    if req.title is not None:
        itinerary.title = req.title
    if req.description is not None:
        itinerary.description = req.description
    if req.days is not None:
        itinerary.days = jsonable_encoder(req.days)
        itinerary.duration_days = len(req.days)
    if req.is_public is not None:
        itinerary.is_public = req.is_public
    if req.status is not None:
        itinerary.status = req.status

    await db.commit()
    await db.refresh(itinerary)
    delete_keys_by_prefix(f"itinerary:{user.id}:")
    return itinerary
