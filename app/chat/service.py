from datetime import datetime
from uuid import uuid4
from typing import List, Dict

from db.db_mongo import conversations
from places.poi_service import get_pois_by_city
from sqlalchemy.ext.asyncio import AsyncSession

MAX_HISTORY = 6

# ----------------------------
# Conversation (MongoDB)
# ----------------------------

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


# ----------------------------
# RAG helpers (Postgres)
# ----------------------------

KNOWN_CITIES = ["Berlin", "Munich", "Hamburg", "Frankfurt"]

def extract_city(text: str) -> str | None:
    for city in KNOWN_CITIES:
        if city.lower() in text.lower():
            return city
    return None


async def build_poi_context(
    db: AsyncSession,
    question: str,
    limit: int = 5
) -> str:
    city = extract_city(question)
    if not city:
        return ""

    pois = await get_pois_by_city(db, city, limit=limit)
    if not pois:
        return ""

    lines = [
        f"- {p['title']} ({p.get('category', 'place')})"
        for p in pois
    ]

    poi_context = f"Known places in {city}:\n" + "\n".join(lines)

    print("POI CONTEXT:\n", poi_context)

    return poi_context


# ----------------------------
# Prompt assembly (used by route)
# ----------------------------

async def build_messages_for_llm(
    db: AsyncSession,
    conversation_id: str,
    question: str
) -> List[Dict]:
    """
    Builds the final message list sent to the LLM:
    1. POI system context (if available)
    2. Conversation history (MongoDB)
    3. Current user question
    """

    messages: List[Dict] = []

    # RAG: inject POI context
    poi_context = await build_poi_context(db, question)
    if poi_context:
        messages.append({
            "role": "system",
            "content": poi_context
        })

    # Conversation memory
    history = get_conversation_history(conversation_id)
    messages.extend(history)

    # Current user input
    messages.append({
        "role": "user",
        "content": question
    })

    return messages
