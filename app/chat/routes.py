# chat/routes.py
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from chat.intent import ChatIntent, detect_intent
from chat.service import (
    append_message,
    build_messages_for_llm,
    create_conversation,
    extract_city,
    get_itinerary_proposal,
    store_itinerary_proposal,
)
from core.dependencies import get_current_user
from db.db_redis import delete_keys_by_prefix
from db.postgres import get_db
from itinerary.parser import convert_ai_response_to_itinerary
from itinerary.service import ItineraryService
from rag.llm_service import llm_service
from rag.retriever import rag_retriever
from schemas.chat import (
    ChatRequest,
    ChatResponse,
    ChatResponseType,
    CommitItineraryProposalRequest,
    CommitItineraryProposalResponse,
)
from utils.translation import translate_back

router = APIRouter(prefix="/explorix", tags=["Chat"])
itinerary_service = ItineraryService()


@router.post("/chat", response_model=ChatResponse)
async def chat(
    req: ChatRequest,
    db: AsyncSession = Depends(get_db),
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
            limit=8,
        )

        response = (
            "Here are some places you might like:\n"
            + "\n".join(f"- {p.title} ({p.category})" for p in places)
            if places
            else "I couldn't find relevant places."
        )

        append_message(conversation_id, "user", req.message)
        append_message(conversation_id, "assistant", response)

        return ChatResponse(
            conversation_id=conversation_id,
            response=response,
            type=ChatResponseType.TEXT,
        )

    # =========================
    # CHAT / ITINERARY
    # =========================
    messages, user_lang = await build_messages_for_llm(
        db=db,
        conversation_id=conversation_id,
        user_message=req.message,
        location=req.location,
        intent=intent,
    )

    answer_en = await llm_service.generate_text(messages)
    final_answer = translate_back(answer_en, user_lang)

    append_message(conversation_id, "user", req.message)
    append_message(conversation_id, "assistant", final_answer)

    destination = (
        req.location.city if req.location else extract_city(req.message)
    ) if intent == ChatIntent.ITINERARY_REQUEST else None

    itinerary_proposal = None
    if intent == ChatIntent.ITINERARY_REQUEST and destination:
        places = await rag_retriever.search_places(
            db=db,
            query=destination,
            limit=10,
        )

        itinerary_draft = convert_ai_response_to_itinerary(
            ai_text=final_answer,
            city=destination,
            places=places,
        )

        proposal_id = str(uuid4())
        itinerary_proposal = {
            "proposal_id": proposal_id,
            "destination": destination,
            "status": "proposed",
            "can_save": True,
            "draft": itinerary_draft,
        }
        store_itinerary_proposal(
            conversation_id=conversation_id,
            proposal_id=proposal_id,
            payload=itinerary_proposal,
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
            itinerary_proposal if intent == ChatIntent.ITINERARY_REQUEST else None
        ),
    )


@router.post("/chat/itinerary/commit", response_model=CommitItineraryProposalResponse)
async def commit_chat_itinerary(
    req: CommitItineraryProposalRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    proposal = get_itinerary_proposal(req.conversation_id, req.proposal_id)
    if not proposal:
        raise HTTPException(status_code=404, detail="Itinerary proposal not found")

    draft = proposal.get("draft")
    if not draft:
        raise HTTPException(status_code=400, detail="Invalid itinerary proposal draft")

    itinerary = await itinerary_service.save_from_draft(
        db=db,
        user_id=user.id,
        draft=draft,
        start_date=req.start_date,
    )

    delete_keys_by_prefix(f"itinerary:{user.id}:")

    return CommitItineraryProposalResponse(
        status="saved",
        itinerary_id=str(itinerary.id),
    )
