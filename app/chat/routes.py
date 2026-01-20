from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from schemas.chat import ChatRequest, ChatResponse, ChatResponseType
from chat.service import (
    create_conversation,
    append_message,
    build_messages_for_llm,
    extract_city
)
from chat.intent import detect_intent, ChatIntent
from db.postgres import get_db
from utils.translation import translate_back
from rag.llm_service import llm_service
from rag.retriever import rag_retriever

router = APIRouter(prefix="/explorix", tags=["Chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat(
    req: ChatRequest,
    db: AsyncSession = Depends(get_db)
):
    user_id = "demo_user"

    conversation_id = (
        create_conversation(user_id)
        if req.conversation_id is None
        else req.conversation_id
    )

    intent = detect_intent(req.message)

    # =========================
    # POI SEARCH
    # =========================
    if intent == ChatIntent.POI_SEARCH:
        places = await rag_retriever.search_places(
            db=db,
            query=f"{req.location.city if req.location else ''} {req.message}",
            limit=8
        )

        response = (
            "Here are some places you might like:\n" +
            "\n".join(f"- {p.title} ({p.category})" for p in places)
            if places else
            "I couldn’t find relevant places."
        )

        append_message(conversation_id, "user", req.message)
        append_message(conversation_id, "assistant", response)

        return ChatResponse(
            conversation_id=conversation_id,
            response=response,
            type=ChatResponseType.TEXT
        )

    # =========================
    # CHAT / ITINERARY
    # =========================
    messages, user_lang = await build_messages_for_llm(
        db=db,
        conversation_id=conversation_id,
        user_message=req.message,
        location=req.location,
        intent=intent
    )

    answer_en = await llm_service.generate_text(messages)


    final_answer = translate_back(answer_en, user_lang)

    append_message(conversation_id, "user", req.message)
    append_message(conversation_id, "assistant", final_answer)

    destination = (
        req.location.city if req.location
        else extract_city(req.message)
    ) if intent == ChatIntent.ITINERARY_REQUEST else None

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
            if intent == ChatIntent.ITINERARY_REQUEST else None
        )
    )
