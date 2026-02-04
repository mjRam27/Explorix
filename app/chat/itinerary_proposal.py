# from datetime import timedelta
# from fastapi import HTTPException

# from schemas.itinerary import ItineraryGenerateRequest
# from rag.retriever import rag_retriever
# from rag.llm_service import llm_service
# from chat.prompts import build_chat_itinerary_prompt
# from chat.json_utils import extract_json


# async def generate_itinerary_proposal(db, req: ItineraryGenerateRequest) -> dict:
#     """
#     Generate itinerary proposal for chat (NO persistence).
#     Hardened against empty / invalid LLM output.
#     """

#     duration = (req.end_date - req.start_date).days + 1

#     # --------------------
#     # RAG retrieval
#     # --------------------
#     places = await rag_retriever.search_places(
#         db=db,
#         query=f"{req.destination} {' '.join(req.interests)}",
#         limit=30
#     )

#     if not places:
#         raise HTTPException(
#             status_code=400,
#             detail="No places found to generate itinerary"
#         )

#     places_map = {str(p.id): p for p in places}

#     context = "\n".join(
#         f"ID:{p.id} Title:{p.title} Category:{p.category}"
#         for p in places
#     )

#     # --------------------
#     # Prompt
#     # --------------------
#     prompt = build_chat_itinerary_prompt(
#         destination=req.destination,
#         start_date=req.start_date.isoformat(),
#         duration=duration,
#         pace=req.pace
#     )

#     # --------------------
#     # LLM call (with retry)
#     # --------------------
#     response = await llm_service.generate_json_with_retry(prompt, context)

#     print("RAW LLM RESPONSE:\n", response)

#     if not response or not response.strip():
#         raise HTTPException(
#             status_code=500,
#             detail="LLM returned empty response"
#         )

#     # --------------------
#     # Safe JSON extraction
#     # --------------------
#     try:
#         data = extract_json(response)
#     except Exception as e:
#         raise HTTPException(
#             status_code=500,
#             detail=f"LLM returned invalid itinerary JSON: {str(e)}"
#         )

#     # --------------------
#     # Inject dates + filter invalid POIs
#     # --------------------
#     current_date = req.start_date

#     for day in data.get("days", []):
#         day.setdefault("date", current_date.isoformat())
#         current_date += timedelta(days=1)

#         day["places"] = [
#             p for p in day.get("places", [])
#             if str(p.get("place_id")) in places_map
#         ]

#     return data
