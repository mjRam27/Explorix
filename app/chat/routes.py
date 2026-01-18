# chat/routes.py

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

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
        "day plan",
        "days itinerary",
        "plan a trip",
        "plan a",
        "day trip",
        "days trip",
        "2 day",
        "3 day",
        "4 day"
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
    - Can propose itineraries (TEXT ONLY, no persistence)
    """

    # TODO: replace with JWT user_id
    user_id = "demo_user"

    # 1️⃣ Conversation handling
    conversation_id = (
        create_conversation(user_id)
        if req.conversation_id is None
        else req.conversation_id
    )

    # 2️⃣ Build base chat messages
    messages, user_lang = await build_messages_for_llm(
        db=db,
        conversation_id=conversation_id,
        user_message=req.message,
        location=req.location
    )

    # 3️⃣ Detect itinerary intent
    is_itinerary = is_itinerary_request(req.message)

    if is_itinerary:
        # 🔹 Add itinerary guidance WITHOUT breaking RAG
        messages.insert(0, {
            "role": "system",
            "content": (
                "You are a travel assistant.\n"
                "Create a clear day-by-day travel itinerary in plain text.\n"
                "Use headings like Day 1, Day 2, Day 3.\n"
                "Do NOT use JSON.\n"
                "Do NOT mention databases or internal logic.\n"
                "Be concise and practical."
            )
        })


        print("ITINERARY DETECTED:", is_itinerary)


    # 4️⃣ LLM call (TEXT ONLY)
    answer_en = await llm_service.generate_text(messages)
    final_answer = translate_back(answer_en, user_lang)

    # 5️⃣ Persist conversation
    append_message(conversation_id, "user", req.message)
    append_message(conversation_id, "assistant", final_answer)

    # 6️⃣ Response
    return ChatResponse(
        conversation_id=conversation_id,
        response=final_answer,
        type=(
            ChatResponseType.ITINERARY_PROPOSAL
            if is_itinerary
            else ChatResponseType.TEXT
        ),
        itinerary_proposal=(
            {
                "destination": req.location.city if req.location else None,
                "status": "proposed",
                "can_save": True
            }
            if is_itinerary else None
        )
    )
