from datetime import timedelta
import re


def normalize_text(text: str) -> str:
    """
    Cleans LLM artifacts and normalizes bullets.
    """
    text = re.sub(r"<\|.*?\|>", "", text)
    text = text.replace("•", "-")
    return text.strip()


def parse_itinerary_text(text: str, places: list, start_date):
    """
    Robust parser:
    - Works with Day 1 / Day 2
    - Works with flat bullet lists
    - Never fails if places exist
    """

    text = normalize_text(text)
    lines = [l.strip("-• ").strip() for l in text.splitlines() if l.strip()]

    if not lines:
        return []

    # ---- Try explicit Day parsing ----
    days = []
    current_day = None
    day_number = 0

    for line in lines:
        if re.match(r"day\s*\d+", line.lower()):
            if current_day:
                days.append(current_day)
            day_number += 1
            current_day = {
                "day": day_number,
                "date": (start_date + timedelta(days=day_number - 1)).isoformat(),
                "places": []
            }
            continue

        if current_day is not None:
            place = match_place(line, places)
            if place:
                current_day["places"].append({
                    "place_id": place.id,
                    "order": len(current_day["places"]) + 1
                })

    if current_day:
        days.append(current_day)

    if days:
        return days

    # ---- FALLBACK MODE ----
    matched_places = []
    for line in lines:
        place = match_place(line, places)
        if place:
            matched_places.append(place)

    # 🔑 CRITICAL FIX: if text vague but places exist → auto use places
    if not matched_places and places:
        matched_places = places[:6]

    if not matched_places:
        return []

    # ---- Infer number of days from text ----
    day_hint = re.search(r"(\d+)\s*day", text.lower())
    if day_hint:
        total_days = int(day_hint.group(1))
    else:
        total_days = max(1, (len(matched_places) + 2) // 3)

    per_day = max(1, len(matched_places) // total_days)

    days = []
    for i in range(0, len(matched_places), per_day):
        chunk = matched_places[i:i + per_day]
        day_index = len(days) + 1
        days.append({
            "day": day_index,
            "date": (start_date + timedelta(days=day_index - 1)).isoformat(),
            "places": [
                {
                    "place_id": p.id,
                    "order": idx + 1
                }
                for idx, p in enumerate(chunk)
            ]
        })

    return days


def match_place(line: str, places: list):
    line_lower = line.lower()
    for p in places:
        if p.title.lower() in line_lower:
            return p
    return None
