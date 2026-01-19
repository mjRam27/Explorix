from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from schemas.chat import ChatRequest, ChatResponse, ChatResponseType
from chat.service import (
    create_conversation,
    append_message,
    build_messages_for_llm
)
from chat.intent import detect_intent, ChatIntent
from db.postgres import get_db
from utils.translation import translate_back
from rag.llm_service import llm_service
from rag.retriever import rag_retriever
from chat.service import extract_city

router = APIRouter(prefix="/explorix", tags=["Chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat(
    req: ChatRequest,
    db: AsyncSession = Depends(get_db)
):
    user_id = "demo_user"  # later JWT

    conversation_id = (
        create_conversation(user_id)
        if req.conversation_id is None
        else req.conversation_id
    )

    intent = detect_intent(req.message)

    # =========================
    # 1️⃣ POI SEARCH (RAG)
    # =========================
    if intent == ChatIntent.POI_SEARCH:
        places = await rag_retriever.search_places(
            db=db,
            query=f"{req.location.city if req.location else ''} {req.message}",
            limit=8
        )

        if not places:
            response = "I couldn’t find relevant places nearby."
        else:
            response = "Here are some places you might like:\n\n"
            for p in places:
                response += f"- {p.title} ({p.category})\n"

        append_message(conversation_id, "user", req.message)
        append_message(conversation_id, "assistant", response)

        return ChatResponse(
            conversation_id=conversation_id,
            response=response,
            type=ChatResponseType.TEXT
        )

    # =========================
    # 2️⃣ ITINERARY REQUEST (TEXT ONLY)
    # =========================
    messages, user_lang = await build_messages_for_llm(
        db=db,
        conversation_id=conversation_id,
        user_message=req.message,
        location=req.location
    )

    if intent == ChatIntent.ITINERARY_REQUEST:
        messages = [
            {
                "role": "system",
                "content": (
                    "You are a travel assistant.\n"
                    "Create a clear day-by-day itinerary.\n"
                    "Use Day 1, Day 2.\n"
                    "Morning / Afternoon / Evening.\n"
                    "Only mention places relevant to the destination.\n"
                    "Do not use JSON."
                )
            }
        ] + messages

    # =========================
    # 3️⃣ GENERAL CHAT
    # =========================
    answer_en = await llm_service.generate_text(messages)
    final_answer = translate_back(answer_en, user_lang)

    append_message(conversation_id, "user", req.message)
    append_message(conversation_id, "assistant", final_answer)
    
    destination = None
    if intent == ChatIntent.ITINERARY_REQUEST:
        destination = (
            req.location.city
            if req.location
            else extract_city(req.message)
        )


    return ChatResponse(
        conversation_id=conversation_id,
        response=final_answer,
        type=(
            ChatResponseType.ITINERARY_PROPOSAL
            if intent == ChatIntent.ITINERARY_REQUEST
            else ChatResponseType.TEXT
        ),
        itinerary_proposal=(
            {
                "destination": destination,
                "status": "proposed",
                "can_save": True
            }
            if intent == ChatIntent.ITINERARY_REQUEST
            else None
        )

    )
