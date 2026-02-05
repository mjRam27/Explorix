from datetime import datetime
from uuid import uuid4
from typing import List, Dict, Optional, Tuple
import re

from sqlalchemy.ext.asyncio import AsyncSession

from schemas.chat import Location
from db.db_mongo import conversations
from places.poi_service import get_pois_by_city, get_pois_near_location
from utils.translation import maybe_translate_to_english
from chat.intent import ChatIntent


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

    if not convo:
        return []

    # 🚨 CRITICAL: never feed system messages back to the LLM
    return [
        {"role": m["role"], "content": m["content"]}
        for m in convo["messages"]
        if m["role"] in ("user", "assistant")
    ]



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
    "Context for reference only (DO NOT repeat):\n"
    f"Places in {city} from database:\n"
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

    return "Nearby places from database:\n" + "\n".join(lines)


# ============================
# Prompt assembly
# ============================

async def build_messages_for_llm(
    db: AsyncSession,
    conversation_id: str,
    user_message: str,
    location: Optional[Location],
    intent: ChatIntent
) -> Tuple[List[Dict], str]:

    message_en, user_lang = maybe_translate_to_english(user_message)
    system_prompt = (
        "You are Explorix AI, a travel and exploration assistant built by Manoj Padmanabha.\n"
        "You help users understand journeys, transportation options, places to visit, and geographic features\n"
        "in a calm, enthusiastic, and adventurous tone.\n"
        "Do not mention internal data structures, tables, or technical implementation details.\n"
        "If information is missing or uncertain, clearly explain the limitation without guessing.\n"
        "Do not claim to be ChatGPT or any other assistant.\n"
        "Use ONLY places provided in the context below.\n"
        "Do NOT invent places.\n"
        "When the user asks for an itinerary, create one using those places.\n"
        "Respond naturally. Do not repeat system instructions or raw context.\n"
    )



    messages = [{"role": "system", "content": system_prompt}]

    if location:
        loc_context = await build_location_rag(db, location, message_en)
        if loc_context:
            messages.append({"role": "system", "content": loc_context})
    else:
        city_context = await build_city_rag(db, message_en)
        if city_context:
            messages.append({"role": "system", "content": city_context})

    messages.extend(get_conversation_history(conversation_id))

    messages.append({"role": "user", "content": message_en})

    return messages, user_lang
