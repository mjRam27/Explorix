# chat/routes.py

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date, timedelta

from schemas.chat import ChatRequest, ChatResponse, ChatResponseType

from chat.service import (
    create_conversation,
    append_message,
    build_messages_for_llm
)

from db.postgres import get_db
from utils.translation import translate_back
from rag.llm_service import llm_service


router = APIRouter(prefix="/explorix", tags=["Chat"])



def is_itinerary_request(text: str) -> bool:
    text = text.lower()
    keywords = [
        "itinerary",
        "plan my trip",
        "travel plan",
        "trip plan",
        "days itinerary"
    ]
    return any(k in text for k in keywords)


@router.post("/chat", response_model=ChatResponse)
async def chat(
    req: ChatRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Explorix Chat:
    - Multilingual
    - RAG grounded in DB
    - Orchestrates itinerary generation (NO persistence)
    """

    # TODO: replace with JWT user_id
    user_id = "demo_user"

    # 1️⃣ Conversation handling
    if req.conversation_id is None:
        conversation_id = create_conversation(user_id)
    else:
        conversation_id = req.conversation_id

    # 2️⃣ Build messages for LLM (chat only)
    messages, user_lang = await build_messages_for_llm(
        db=db,
        conversation_id=conversation_id,
        user_message=req.message,
        location=req.location
    )

    # 3️⃣ Detect itinerary intent (TEXT ONLY)
    if is_itinerary_request(req.message):

        messages.append({
            "role": "system",
            "content": (
                "Create a clear day-by-day travel itinerary in plain text.\n"
                "Use headings like Day 1, Day 2, Day 3.\n"
                "Do NOT use JSON.\n"
                "Be concise and practical."
            )
        })

    # 4️⃣ Normal chat flow (LLM call REQUIRED)
    answer_en = await llm_service.generate_text(messages)
    final_answer = translate_back(answer_en, user_lang)

    append_message(conversation_id, "user", req.message)
    append_message(conversation_id, "assistant", final_answer)

    return ChatResponse(
        conversation_id=conversation_id,
        response=final_answer,
        type=ChatResponseType.TEXT
    )
