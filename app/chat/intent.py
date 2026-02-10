#chat/intent.py
import re
from enum import Enum


class ChatIntent(str, Enum):
    CHAT = "CHAT"
    POI_SEARCH = "POI_SEARCH"
    ITINERARY_REQUEST = "ITINERARY_REQUEST"


def detect_intent(text: str) -> ChatIntent:
    text = text.strip().lower()

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
        "nearby",
        "things to do",
    ]

    poi_patterns = [
        r"\bplaces?\s+(to\s+)?visit\b",
        r"\bwhat\s+to\s+visit\b",
        r"\bwhere\s+to\s+(go|eat|visit)\b",
        r"\bshow\s+me\s+places\b",
        r"\bnear\s+me\b",
    ]

    # General knowledge/chat style questions should stay in CHAT,
    # even if they contain place words like "lake" or "beach".
    general_question_patterns = [
        r"^what kind of\b",
        r"^what is\b",
        r"^how\b",
        r"^can\b",
        r"^why\b",
        r"^are you\b",
        r"^who are you\b",
    ]

    if any(k in text for k in itinerary_keywords):
        return ChatIntent.ITINERARY_REQUEST

    if any(re.search(p, text) for p in general_question_patterns):
        return ChatIntent.CHAT

    if any(k in text for k in poi_keywords):
        return ChatIntent.POI_SEARCH

    if any(re.search(p, text) for p in poi_patterns):
        return ChatIntent.POI_SEARCH

    return ChatIntent.CHAT


def extract_days(text: str) -> int:
    match = re.search(r"(\d+)\s*day", text.lower())
    return int(match.group(1)) if match else 3
