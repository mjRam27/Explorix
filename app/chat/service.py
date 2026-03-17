#chat/service.py
from datetime import datetime
from uuid import uuid4
from typing import List, Dict, Optional, Tuple, Any
import re

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
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

    # Never feed system messages back to the LLM, and skip leaked instruction echoes.
    leak_markers = (
        "you are explorix ai",
        "you help users understand journeys",
        "do not mention internal",
        "respond naturally",
        "system instructions",
    )
    cleaned: List[Dict] = []
    for m in convo["messages"]:
        role = m.get("role")
        content = (m.get("content") or "").strip()
        if role not in ("user", "assistant") or not content:
            continue
        if role == "assistant":
            lower = content.lower()
            if any(marker in lower for marker in leak_markers):
                continue
        cleaned.append({"role": role, "content": content})
    return cleaned


def store_itinerary_proposal(
    conversation_id: str,
    proposal_id: str,
    payload: Dict[str, Any],
):
    conversations.update_one(
        {"conversation_id": conversation_id},
        {
            "$set": {
                f"itinerary_proposals.{proposal_id}": {
                    **payload,
                    "created_at": datetime.utcnow(),
                },
                "updated_at": datetime.utcnow(),
            }
        },
        upsert=False,
    )


def get_itinerary_proposal(
    conversation_id: str,
    proposal_id: str,
) -> Optional[Dict[str, Any]]:
    convo = conversations.find_one(
        {"conversation_id": conversation_id},
        {"_id": 0, f"itinerary_proposals.{proposal_id}": 1},
    )
    if not convo:
        return None
    proposals = convo.get("itinerary_proposals") or {}
    proposal = proposals.get(proposal_id)
    return proposal if isinstance(proposal, dict) else None



# ============================
# Helpers
# ============================

# KNOWN_CITIES = {
#     "berlin": "Berlin",
#     "munich": "Munich",
#     "münchen": "Munich",
#     "munchen": "Munich",
#     "hamburg": "Hamburg",
#     "frankfurt": "Frankfurt",
#     "cologne": "Cologne",
#     "köln": "Cologne",
#     "Heidelberg": "Heidelberg",
# }


async def extract_city_from_db(db: AsyncSession, user_text: str) -> Optional[str]:
    user_text = user_text.lower()

    # 1️⃣ Try regex
    match = re.search(r"(?:in|to)\s+([a-zA-ZäöüÄÖÜß\s]+)", user_text)

    if match:
        possible_city = match.group(1).strip()
        possible_city = re.split(r"\b(for|near|with|and)\b", possible_city)[0].strip()

        result = await db.execute(
            text("""
                SELECT DISTINCT city 
                FROM poi 
                WHERE LOWER(city) LIKE :city 
                LIMIT 1
            """),
            {"city": f"%{possible_city.lower()}%"}
        )

        row = result.fetchone()
        if row:
            return row[0]

    # 2️⃣ fallback
    words = re.findall(r"[a-zA-ZäöüÄÖÜß]+", user_text)

    for word in words:
        result = await db.execute(
            text("""
                SELECT DISTINCT city 
                FROM poi 
                WHERE LOWER(city) = :city
                LIMIT 1
            """),
            {"city": word.lower()}
        )
        row = result.fetchone()
        if row:
            return row[0]

    return None

def extract_radius_km(text: str) -> Optional[float]:
    match = re.search(r'(\d+(?:\.\d+)?)\s*(km|kilometer|kilometers)', text.lower())
    return float(match.group(1)) if match else None


# ============================
# RAG builders
# ============================

async def build_city_rag(db: AsyncSession, message_en: str, limit: int = 10) -> str:
    city = await extract_city_from_db(db, message_en)
    if not city:
        return ""

    pois = await get_pois_by_city(db, city, limit=limit)
    if not pois:
        return ""

    lines = [
        f"{i+1}. {p['title']} | Category: {p.get('category', 'place')}"
        for i, p in enumerate(pois)
    ]
    print("CITY:", city)
    print("POIS:", pois)

    return (
        f"AVAILABLE PLACES IN {city.upper()} (USE EXACT NAMES ONLY):\n"
        + "\n".join(lines)
    )

async def build_location_rag(
    db: AsyncSession,
    location: Location,
    message_en: str,
    limit: int = 10
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
        f"{i+1}. {p['title']} | {p.get('category','place')} | {round(p.get('distance_km',0),2)} km"
        for i, p in enumerate(pois)
    ]

    return (
        "AVAILABLE NEARBY PLACES (USE EXACT NAMES ONLY):\n"
        + "\n".join(lines)
    )

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

    # ✅ BASE PROMPT (stable for fine-tuning)
    base_prompt = (
        "You are Explorix AI, a travel assistant built by Manoj Padmanabha.\n"
        "You help users explore places and plan trips.\n\n"
        
        "STRICT RULES (MUST FOLLOW):\n"
        "1. ONLY use places from the provided list.\n"
        "2. NEVER invent or guess places.\n"
        "3. If no places are provided, say: 'No places found for this request.'\n"
        "4. DO NOT use any external knowledge.\n"
        "5. Use EXACT place names from the list.\n\n"
        
        "If you break these rules, the answer is incorrect.\n"
    )

    # ✅ TASK-SPECIFIC RULES
    task_instruction = ""

    if intent == ChatIntent.ITINERARY_REQUEST:
        task_instruction = (
            "\nIf the user asks for an itinerary:\n"
            "- Select 3 to 5 places from the provided list\n"
            "- Use format:\n"
            "  Morning: <place>\n"
            "  Afternoon: <place>\n"
            "  Evening: <place>\n"
            "- Always use exact place names\n"
        )

    elif intent == ChatIntent.POI_SEARCH:
        task_instruction = (
            "\nRecommend places ONLY from the provided list.\n"
        )

    system_prompt = base_prompt + task_instruction

    messages = [{"role": "system", "content": system_prompt}]

    # ✅ RAG CONTEXT (ALWAYS assistant role)
    if intent in (ChatIntent.POI_SEARCH, ChatIntent.ITINERARY_REQUEST):

        if location:
            loc_context = await build_location_rag(db, location, message_en)
            if loc_context:
                messages.append({
                    "role": "assistant",
                    "content": f"Context:\n{loc_context}"
                })

                # 🔥 Add location awareness
                messages.append({
                    "role": "assistant",
                    "content": f"User current location: {location.lat}, {location.lng}"
                })

        else:
            city_context = await build_city_rag(db, message_en)
            if city_context:
                messages.append({
                    "role": "assistant",
                    "content": f"Here are available places:\n{city_context}"
                })

    # ✅ HISTORY
    messages.extend(get_conversation_history(conversation_id))

    # ✅ USER MESSAGE
    messages.append({"role": "user", "content": message_en})

    return messages, user_lang