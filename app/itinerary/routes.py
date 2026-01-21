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
