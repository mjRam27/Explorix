from enum import Enum


class ChatIntent(str, Enum):
    ITINERARY_REQUEST = "itinerary_request"
    POI_SEARCH = "poi_search"
    GENERAL_CHAT = "general_chat"


def detect_intent(text: str) -> ChatIntent:
    t = text.lower()

    itinerary_keywords = [
        "itinerary",
        "plan my trip",
        "plan a trip",
        "travel plan",
        "day plan",
        "2 day",
        "3 day",
        "4 day",
        "days in",
    ]

    poi_keywords = [
        "nearby",
        "near me",
        "places",
        "restaurants",
        "cafes",
        "bars",
        "parks",
        "lakes",
        "things to do",
        "visit",
    ]

    if any(k in t for k in itinerary_keywords):
        return ChatIntent.ITINERARY_REQUEST

    if any(k in t for k in poi_keywords):
        return ChatIntent.POI_SEARCH

    return ChatIntent.GENERAL_CHAT
