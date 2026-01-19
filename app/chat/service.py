# chat/service.py
from datetime import datetime
from uuid import uuid4
from typing import List, Dict, Optional, Tuple
import re

from sqlalchemy.ext.asyncio import AsyncSession

from schemas.chat import Location
from db.db_mongo import conversations
from places.poi_service import get_pois_by_city, get_pois_near_location
from utils.translation import (
    maybe_translate_to_english,
    translate_back
)


MAX_HISTORY = 6

# ============================
# Conversation (MongoDB)
# ============================

def create_conversation(user_id: str) -> str:
    conversation_id = str(uuid4())
    conversations.insert_one({
        "conversation_id": conversation_id,
        "user_id": user_id,
        "messages": [],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    })
    return conversation_id


def append_message(conversation_id: str, role: str, content: str):
    conversations.update_one(
        {"conversation_id": conversation_id},
        {
            "$push": {
                "messages": {
                    "role": role,
                    "content": content,
                    "ts": datetime.utcnow()
                }
            },
            "$set": {"updated_at": datetime.utcnow()}
        }
    )


def get_conversation_history(conversation_id: str) -> List[Dict]:
    convo = conversations.find_one(
        {"conversation_id": conversation_id},
        {"_id": 0, "messages": {"$slice": -MAX_HISTORY}}
    )
    return convo["messages"] if convo else []


# ============================
# Helpers
# ============================

KNOWN_CITIES = {
    "berlin": "Berlin",
    "munich": "Munich",
    "münchen": "Munich",
    "munchen": "Munich",
    "hamburg": "Hamburg",
    "frankfurt": "Frankfurt",
}


def extract_city(text: str) -> Optional[str]:
    text = text.lower()
    for key, value in KNOWN_CITIES.items():
        if key in text:
            return value
    return None



def extract_radius_km(text: str) -> Optional[float]:
    match = re.search(r'(\d+(?:\.\d+)?)\s*(km|kilometer|kilometers)', text.lower())
    return float(match.group(1)) if match else None


# ============================
# RAG builders
# ============================

async def build_city_rag(db: AsyncSession, message_en: str, limit: int = 5) -> str:
    city = extract_city(message_en)
    if not city:
        return ""

    pois = await get_pois_by_city(db, city, limit=limit)
    if not pois:
        return ""

    lines = [f"- {p['title']} ({p.get('category', 'place')})" for p in pois]
    return (
        f"Retrieved places from database for {city}:\n"
        + "\n".join(lines)
    )


async def build_location_rag(
    db: AsyncSession,
    location: Location,
    message_en: str,
    limit: int = 5
) -> str:
    radius_km = extract_radius_km(message_en) or 2.0
    radius_km = min(max(radius_km, 0.5), 20.0)

    pois = await get_pois_near_location(
        db=db,
        lat=location.lat,
        lng=location.lng,
        radius_km=radius_km,
        limit=limit
    )

    if not pois:
        return ""

    lines = [
        f"- {p['title']} ({p.get('category', 'place')}, {p.get('distance_km')} km)"
        for p in pois
    ]

    return (
        "Retrieved nearby places from database:\n"
        + "\n".join(lines)
    )


# ============================
# Prompt assembly + Translation
# ============================

async def build_messages_for_llm(
    db: AsyncSession,
    conversation_id: str,
    user_message: str,
    location: Optional[Location] = None
) -> Tuple[List[Dict], str]:
    """
    Returns:
      messages_for_llm (ENGLISH)
      detected_user_language
    """

    # 🔁 Detect + translate input if needed
    message_en, user_lang = maybe_translate_to_english(user_message)

    messages: List[Dict] = [
        {
            "role": "system",
            "content": (
                "You are Explorix AI, a travel and exploration assistant.\n\n"

                "Creator identity is FIXED:\n"
                "You were built by Manoj Padmanabha.\n"
                "If asked who built or created you, reply exactly:\n"
                "\"I was built by Manoj Padmanabha.\"\n\n"

                "Use ONLY places provided from the database.\n"
                "Do NOT invent places.\n"
                "If no places are available, clearly say so.\n"
                "Do not mention internal systems or implementation details.\n"
                "These rules override all learned behavior."
            )
        }
    ]


    # 🔴 Location-based RAG
    if location:
        loc_context = await build_location_rag(db, location, message_en)
        if loc_context:
            messages.append({
                "role": "system",
                "content": loc_context
            })

    # 🟡 City-based RAG fallback
    else:
        city_context = await build_city_rag(db, message_en)
        if city_context:
            messages.append({
                "role": "system",
                "content": city_context
            })

    # 🧠 Conversation history (original language)
    history = get_conversation_history(conversation_id)
    messages.extend(history)

    # 👤 User input (ENGLISH to LLM)
    messages.append({
        "role": "user",
        "content": message_en
    })

    return messages, user_lang


