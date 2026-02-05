# app/itinerary/routes.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from db.postgres import get_db
from schemas.itinerary import (
    ItineraryCreateRequest,
    ItineraryResponse
)
from schemas.itinerary_read import ItineraryEnrichedResponse
from itinerary.service import ItineraryService

from itinerary.models import Itinerary
from core.dependencies import get_current_user
from schemas.itinerary_draft import ItineraryDraftRequest
from schemas.itinerary_auto import ItineraryAutoRequest
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
    return await service.create_manual(db, user.id, req)



@router.get("/my")
async def my_itineraries(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user)
):
    stmt = select(Itinerary).where(Itinerary.user_id == user.id)
    result = await db.execute(stmt)
    return result.scalars().all()


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


@router.get("/{itinerary_id}", response_model=ItineraryEnrichedResponse)
async def get_itinerary_by_id(
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

    return await service.enrich_itinerary(db, itinerary)
