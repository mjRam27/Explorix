# chat/intent.py
import re
from enum import Enum


class ChatIntent(str, Enum):
    CHAT = "CHAT"
    POI_SEARCH = "POI_SEARCH"
    ITINERARY_REQUEST = "ITINERARY_REQUEST"


def detect_intent(text: str) -> ChatIntent:
    text = text.lower()

    itinerary_keywords = [
        "itinerary",
        "plan",
        "schedule",
        "trip",
        "travel plan",
        "day trip"
    ]

    poi_keywords = [
        "restaurant",
        "cafe",
        "lake",
        "places",
        "nearby",
        "visit",
        "things to do"
    ]

    if any(k in text for k in itinerary_keywords):
        return ChatIntent.ITINERARY_REQUEST

    if any(k in text for k in poi_keywords):
        return ChatIntent.POI_SEARCH

    return ChatIntent.CHAT


def extract_days(text: str) -> int:
    match = re.search(r"(\d+)\s*day", text.lower())
    return int(match.group(1)) if match else 3
