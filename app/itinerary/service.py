# app/itinerary/service.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from datetime import timedelta
# import json

from fastapi import HTTPException

from itinerary.models import Itinerary, ItineraryPlace
from schemas.itinerary import ItineraryCreateRequest

from places.models import Place
from rag.retriever import rag_retriever
# from rag.llm_service import llm_service
# from itinerary.prompts import build_itinerary_prompt
from itinerary.parser import parse_itinerary_text
from schemas.itinerary_from_text import ItineraryFromTextRequest



class ItineraryService:

    # =========================
    # AI GENERATION (SINGLE SOURCE OF TRUTH)
    # =========================
    # async def generate_ai(
    #     self,
    #     db: AsyncSession,
    #     user_id: UUID,
    #     req: ItineraryGenerateRequest,
    #     persist: bool = True,   # 🔑 NEW
    # ):

    #     duration = (req.end_date - req.start_date).days + 1

    #     # ---- RAG retrieval ----
    #     places = await rag_retriever.search_places(
    #         db=db,
    #         query=f"{req.destination} {' '.join(req.interests)}",
    #         limit=40
    #     )

    #     if not places:
    #         raise HTTPException(
    #             status_code=400,
    #             detail="No places found to generate itinerary"
    #         )

    #     context = "\n".join(
    #         f"ID:{p.id} Title:{p.title} Category:{p.category}"
    #         for p in places
    #     )

    #     places_map = {str(p.id): p for p in places}

    #     # ---- LLM ----
    #     prompt = build_itinerary_prompt(req, duration)
    #     response = await llm_service.generate_json(prompt, context)

    #     try:
    #         data = json.loads(response.strip())
    #     except json.JSONDecodeError:
    #         raise HTTPException(500, "LLM returned invalid JSON")

    #     # ---- Inject dates + filter invalid POIs ----
    #     current_date = req.start_date
    #     for day in data["days"]:
    #         day.setdefault("date", current_date.isoformat())
    #         current_date += timedelta(days=1)

    #         day["places"] = [
    #             p for p in day["places"]
    #             if str(p["place_id"]) in places_map
    #         ]

    #     # =====================================================
    #     # 🔁 PROPOSAL MODE (NO DB WRITE)
    #     # =====================================================
    #     if not persist:
    #         return {
    #             "title": data["title"],
    #             "destination": req.destination,
    #             "duration_days": duration,
    #             "days": data["days"],
    #             "tags": data.get("tags", []),
    #         }

    #     # =====================================================
    #     # 💾 PERSIST MODE (UNCHANGED BEHAVIOR)
    #     # =====================================================
    #     itinerary = Itinerary(
    #         user_id=user_id,
    #         title=data["title"],
    #         description=data.get("description"),
    #         destination=req.destination,
    #         start_date=req.start_date,
    #         end_date=req.end_date,
    #         duration_days=duration,
    #         days=data["days"],
    #         tags=data.get("tags", []),
    #         travel_style=req.pace,
    #         budget=req.budget,
    #         ai_generated=True
    #     )

    #     db.add(itinerary)
    #     await db.commit()
    #     await db.refresh(itinerary)

    #     # ---- Normalized table (analytics) ----
    #     for day in data["days"]:
    #         for place in day["places"]:
    #             db.add(ItineraryPlace(
    #                 itinerary_id=itinerary.id,
    #                 place_id=int(place["place_id"]),
    #                 day_number=day["day"],
    #                 order_in_day=place["order"]
    #             ))

    #     await db.commit()
    #     return itinerary

   # =====================================================
    # TEXT → STRUCTURED ITINERARY (FROM CHAT)
    # =====================================================
    async def create_from_text(
        self,
        db: AsyncSession,
        user_id: UUID,
        req: ItineraryFromTextRequest
    ) -> Itinerary:

        places = await rag_retriever.search_places(
            db=db,
            query=req.destination,
            limit=40
        )

        if not places:
            raise HTTPException(400, "No places found for destination")

        days = parse_itinerary_text(
            text=req.text_plan,
            places=places,
            start_date=req.start_date
        )

        if not days:
            raise HTTPException(400, "Could not extract itinerary from text")

        itinerary = Itinerary(
            user_id=user_id,
            title=f"{req.destination} {len(days)}-Day Trip",
            destination=req.destination,
            start_date=req.start_date,
            end_date=req.start_date + timedelta(days=len(days) - 1),
            duration_days=len(days),
            days=days,
            ai_generated=True
        )

        db.add(itinerary)
        await db.flush()  # ensures itinerary.id exists without committing

        for day in days:
            for place in day["places"]:
                db.add(ItineraryPlace(
                    itinerary_id=itinerary.id,
                    place_id=int(place["place_id"]),
                    day_number=day["day"],
                    order_in_day=place["order"]
                ))

        await db.commit()
        await db.refresh(itinerary)



        return itinerary



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
 