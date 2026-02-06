# app/itinerary/routes.py

from fastapi import APIRouter, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
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
from places.models import Place
from sqlalchemy import or_



router = APIRouter(prefix="/itinerary", tags=["Itinerary"])
service = ItineraryService()


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


@router.post("/auto")
async def auto_itinerary(
    req: ItineraryAutoRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user)
):
    style_map = {
        "adventurous": ["nature", "adventure", "trail", "hike", "mountain", "park"],
        "relaxing": ["spa", "park", "nature", "lake", "beach", "wellness"],
        "fun": ["entertainment", "theme", "nightlife", "museum", "shopping", "food"],
    }

    keywords = style_map.get(req.style, [])
    limit = max(3, min(60, req.days * 3))

    stmt = select(Place).where(
        or_(
            Place.city.ilike(f"%{req.destination}%"),
            Place.state.ilike(f"%{req.destination}%")
        )
    )

    if keywords:
        keyword_filters = [Place.category.ilike(f"%{k}%") for k in keywords]
        stmt = stmt.where(or_(*keyword_filters))

    stmt = stmt.order_by(Place.rating.desc().nullslast()).limit(limit)
    result = await db.execute(stmt)
    places = result.scalars().all()

    if not places:
        fallback_stmt = select(Place).order_by(Place.rating.desc().nullslast()).limit(limit)
        fallback_result = await db.execute(fallback_stmt)
        places = fallback_result.scalars().all()

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

    for idx, place in enumerate(places):
        day_idx = idx // 3
        if day_idx >= req.days:
            break
        slot = slots[idx % 3]
        days[day_idx]["slots"][slot].append({
            "place_id": place.id,
            "name": place.title,
            "category": place.category,
        })

    return {
        "destination": req.destination,
        "days": days,
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

    sql = """
    SELECT
        id,
        title,
        category,
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

    if req.category:
        categories = [c.strip() for c in req.category.split(",") if c.strip()]
        if categories:
            sql += " AND (" + " OR ".join(
                [f"category ILIKE :cat{i}" for i in range(len(categories))]
            ) + ")"
            for i, cat in enumerate(categories):
                params[f"cat{i}"] = f"%{cat}%"

    sql += " ORDER BY RANDOM() LIMIT :limit"
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

    return {
        "destination": "Nearby",
        "days": days,
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
