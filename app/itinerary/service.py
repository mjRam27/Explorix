# app/itinerary/service.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from datetime import timedelta


from fastapi import HTTPException

from itinerary.models import Itinerary, ItineraryPlace
from schemas.itinerary import ItineraryCreateRequest
from itinerary.parser import normalize_draft_for_persistence

from places.models import Place
from datetime import timedelta, date

class ItineraryService:

    # =========================
    # MANUAL CREATION (UNCHANGED)
    # =========================
    async def create_manual(
        self,
        db: AsyncSession,
        user_id: UUID,
        req: ItineraryCreateRequest
    ) -> Itinerary:

        duration = (req.end_date - req.start_date).days + 1

        itinerary = Itinerary(
            user_id=user_id,
            title=req.title,
            description=req.description,
            destination=req.destination,
            start_date=req.start_date,
            end_date=req.end_date,
            duration_days=duration,
            days=[d.dict() for d in req.days],
            travel_style=req.travel_style,
            budget=req.budget,
            tags=req.tags
        )

        db.add(itinerary)
        await db.commit()
        await db.refresh(itinerary)

        return itinerary

    # =========================
    # POI ENRICHMENT (UNCHANGED)
    # =========================
    async def _fetch_poi_map(
        self,
        db: AsyncSession,
        place_ids: set[int]
    ) -> dict[int, Place]:

        stmt = select(Place).where(Place.id.in_(place_ids))
        result = await db.execute(stmt)
        pois = result.scalars().all()
        return {p.id: p for p in pois}

    async def enrich_itinerary(
        self,
        db: AsyncSession,
        itinerary: Itinerary
    ) -> dict:

        place_ids = {
            p["place_id"]
            for day in itinerary.days
            for p in day["places"]
        }

        poi_map = await self._fetch_poi_map(db, place_ids)

        enriched_days = []

        for day in itinerary.days:
            enriched_places = []

            for p in day["places"]:
                poi = poi_map.get(p["place_id"])
                if not poi:
                    continue

                enriched_places.append({
                    "id": poi.id,
                    "name": poi.title,
                    "category": poi.category,
                    "rating": poi.rating,
                    "reviews_count": poi.reviews_count,
                    "city": poi.city,
                    "country_code": poi.country_code,
                    "latitude": poi.latitude,
                    "longitude": poi.longitude,
                    "google_maps_url": poi.google_maps_url,
                    "order": p["order"],
                })

            enriched_days.append({
                "day": day["day"],
                "date": day["date"],
                "title": day.get("title"),
                "notes": day.get("notes"),
                "places": enriched_places
            })

        return {
            "id": str(itinerary.id),
            "title": itinerary.title,
            "destination": itinerary.destination,
            "duration_days": itinerary.duration_days,
            "days": enriched_days
        }
 
    async def save_from_draft(
        self,
        db: AsyncSession,
        user_id: UUID,
        draft: dict
    ) -> Itinerary:
        """
        Persist itinerary draft created from chat.
        Draft = UI-friendly (slots)
        Persistence = DB-friendly (places)
        """

        if not draft:
            raise HTTPException(400, "Invalid itinerary draft")

        # ✅ Convert UI draft → DB-safe structure
        normalized = normalize_draft_for_persistence(draft)

        destination = normalized["destination"]
        days = normalized["days"]

        start_date = date.fromisoformat(days[0]["date"])
        duration_days = len(days)

        itinerary = Itinerary(
            user_id=user_id,
            title=normalized["title"],
            destination=destination,
            start_date=start_date,
            end_date=start_date + timedelta(days=duration_days - 1),
            duration_days=duration_days,
            days=days,
            ai_generated=True
        )

        db.add(itinerary)
        await db.flush()  # ensures itinerary.id exists

        # ✅ Normalized relational table
        for day in days:
            for place in day["places"]:
                db.add(ItineraryPlace(
                    itinerary_id=itinerary.id,
                    place_id=place["place_id"],
                    day_number=day["day"],
                    order_in_day=place["order"]
                ))

        await db.commit()
        await db.refresh(itinerary)

        return itinerary
