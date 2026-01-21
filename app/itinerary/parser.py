# itinerary/parser.py
"""
Itinerary Parser (Backend-Controlled)

Purpose:
- Convert natural AI chat responses into a structured itinerary
- NO reliance on LLM formatting
- NO Day/Morning keywords required from AI
- Deterministic, DB-grounded, exam-safe
"""

from typing import List, Dict
from datetime import date

def convert_ai_response_to_itinerary(
    ai_text: str,
    city: str,
    places: List[object],
) -> Dict:
    """
    Convert AI natural language response into a structured itinerary.

    Rules:
    - Only places that exist in DB and appear in AI text are used
    - Order is determined by appearance in text
    - Slot assignment is deterministic (index-based)
    - No AI assumptions, no guessing

    Args:
        ai_text: Natural language response from Explorix AI
        city: City name
        places: List of DB place objects (must have id, title, category)

    Returns:
        Structured itinerary dictionary (DRAFT, not saved)
    """

    slots = {
        "morning": [],
        "afternoon": [],
        "evening": []
    }

    text = ai_text.lower()
    found_places = []

    # 1. Extract places mentioned in AI text (DB-grounded only)
    for place in places:
        place_name = place.title.lower()
        if place_name in text:
            found_places.append({
                "index": text.find(place_name),
                "place": place
            })

    # 2. Sort by appearance order
    found_places.sort(key=lambda x: x["index"])

    # 3. Deterministic slot assignment (no AI dependency)
    slot_order = ["morning", "afternoon", "evening"]

    for i, item in enumerate(found_places):
        slot = slot_order[min(i, 2)]  # cap at evening
        place = item["place"]

        slots[slot].append({
            "place_id": place.id,
            "name": place.title,
            "category": place.category
        })

    # 4. Return DRAFT itinerary (user must confirm to save)
    return {
        "city": city,
        "days": [
            {
                "day": 1,
                "slots": slots
            }
        ],
        "created_by": "backend_parser",
        "editable": True
    }

def normalize_draft_for_persistence(draft: Dict) -> Dict:
    """
    Convert UI draft (slots-based) into DB-persistable itinerary structure.
    """

    destination = draft.get("destination") or draft.get("city")
    if not destination:
        raise ValueError("Draft must include city or destination")

    start_date = date.today()

    normalized_days: List[Dict] = []

    for i, day in enumerate(draft["days"], start=1):
        places = []
        order = 1

        slots = day.get("slots", {})
        for slot_name in ("morning", "afternoon", "evening"):
            for p in slots.get(slot_name, []):
                places.append({
                    "place_id": p["place_id"],
                    "order": order
                })
                order += 1

        normalized_days.append({
            "day": i,
            "date": start_date.isoformat(),
            "places": places
        })

    return {
        "destination": destination,
        "title": f"{destination} Trip",
        "days": normalized_days
    }