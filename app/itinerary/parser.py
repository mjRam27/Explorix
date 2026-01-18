from datetime import timedelta
from typing import List
from places.models import Place


def parse_itinerary_text(
    text: str,
    places: List[Place],
    start_date
) -> list[dict]:
    """
    Converts LLM text itinerary into structured itinerary days.
    """

    place_lookup = {
        p.title.lower(): p.id
        for p in places
    }

    days = []
    current_day = None
    day_index = 0

    for line in text.splitlines():
        line = line.strip()

        # Detect new day
        if line.lower().startswith("day"):
            day_index += 1
            current_day = {
                "day": day_index,
                "date": (start_date + timedelta(days=day_index - 1)).isoformat(),
                "places": []
            }
            days.append(current_day)
            continue

        # Detect place
        if line.startswith("-") and current_day:
            place_name = line[1:].strip().lower()
            place_id = place_lookup.get(place_name)

            if not place_id:
                continue  # skip hallucinations safely

            current_day["places"].append({
                "place_id": place_id,
                "order": len(current_day["places"]) + 1,
                "duration_minutes": 90
            })

    return days
