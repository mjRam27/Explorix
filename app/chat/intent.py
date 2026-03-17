# chat/intent.py
import re
from enum import Enum


class ChatIntent(str, Enum):
    CHAT = "CHAT"
    POI_SEARCH = "POI_SEARCH"
    ITINERARY_REQUEST = "ITINERARY_REQUEST"


def detect_intent(text: str) -> ChatIntent:
    text = text.strip().lower()

    # =========================
    # KEYWORDS
    # =========================
    itinerary_keywords = [
        "itinerary",
        "plan",
        "schedule",
        "trip",
        "travel plan",
        "day trip",
        "vacation",
    ]

    poi_keywords = [
        "restaurant",
        "cafe",
        "nearby",
        "things to do",
        "places",
        "attractions",
    ]

    # =========================
    # PATTERNS
    # =========================
    poi_patterns = [
        r"\bplaces?\s+(to\s+)?visit\b",
        r"\bwhat\s+to\s+visit\b",
        r"\bwhere\s+to\s+(go|eat|visit)\b",
        r"\bshow\s+me\s+places\b",
        r"\bnear\s+me\b",
        r"\bthings\s+to\s+do\b",
    ]

    itinerary_patterns = [
        r"\bplan\s+(a\s+)?trip\b",
        r"\bplan\s+(a\s+)?itinerary\b",
        r"\bcreate\s+(a\s+)?itinerary\b",
        r"\b\d+\s*day\s+(trip|itinerary)\b",
    ]

    general_question_patterns = [
        r"^what kind of\b",
        r"^what is\b",
        r"^how\b",
        r"^can\b",
        r"^why\b",
        r"^are you\b",
        r"^who are you\b",
    ]

    # =========================
    # 1. ITINERARY (highest priority)
    # =========================
    if any(re.search(p, text) for p in itinerary_patterns):
        return ChatIntent.ITINERARY_REQUEST

    if any(k in text for k in itinerary_keywords):
        return ChatIntent.ITINERARY_REQUEST

    # Special case: "plan near me"
    if "plan" in text and any(x in text for x in ["near me", "nearby", "around me"]):
        return ChatIntent.ITINERARY_REQUEST

    # =========================
    # 2. GENERAL CHAT
    # =========================
    if any(re.search(p, text) for p in general_question_patterns):
        return ChatIntent.CHAT

    # =========================
    # 3. POI SEARCH
    # =========================
    if any(re.search(p, text) for p in poi_patterns):
        return ChatIntent.POI_SEARCH

    if any(k in text for k in poi_keywords):
        return ChatIntent.POI_SEARCH

    # =========================
    # DEFAULT → CHAT
    # =========================
    return ChatIntent.CHAT


# =========================
# DAYS EXTRACTION
# =========================
def extract_days(text: str) -> int:
    text = text.lower()

    # Matches:
    # "3 days", "2 day", "5-day", "for 4 days"
    match = re.search(r"(\d+)\s*[-]?\s*day", text)

    if match:
        days = int(match.group(1))
        return max(1, min(days, 14))  # safety: 1–14 days

    # Default (safe fallback)
    return 3