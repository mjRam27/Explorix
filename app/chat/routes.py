# chat/routes.py
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from ai.inference import generate_explorix_response
from chat.intent import ChatIntent, detect_intent, extract_days
from chat.service import (
    append_message,
    build_messages_for_llm,
    create_conversation,
    extract_city_from_db,
    get_itinerary_proposal,
    store_itinerary_proposal,
)
from ai.llama_client import generate_from_llama
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

        query = req.message
        if req.location and req.location.city:
            query += f" in {req.location.city}"

        places = await rag_retriever.search_places(
            db=db,
            query=query,
            limit=8,
        )

        if not places:
            return ChatResponse(
                conversation_id=conversation_id,
                response="I couldn't find enough nearby places.",
                type=ChatResponseType.TEXT,
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

    answer_en = await generate_from_llama(messages)

    # 🔥 IMPORTANT: do NOT translate itinerary
    if intent == ChatIntent.ITINERARY_REQUEST:
        final_answer = answer_en
    else:
        final_answer = translate_back(answer_en, user_lang)

    append_message(conversation_id, "user", req.message)
    append_message(conversation_id, "assistant", final_answer)

    # =========================
    # ITINERARY HANDLING
    # =========================
    itinerary_proposal = None

    if intent == ChatIntent.ITINERARY_REQUEST:

        # 🔥 detect nearby intent
        text = req.message.lower()
        is_nearby = any(x in text for x in ["near me", "nearby", "around me"])

        # =========================
        # CASE 1: NEARBY
        # =========================
        if is_nearby and req.location:

            places = await rag_retriever.search_places(
                db=db,
                query="nearby",
                lat=req.location.lat,
                lng=req.location.lng,
                limit=12,
            )

            if not places:
                return ChatResponse(
                    conversation_id=conversation_id,
                    response="I couldn't find enough nearby places to create an itinerary.",
                    type=ChatResponseType.TEXT,
                )

            destination = "Your current location"

        # =========================
        # CASE 2: CITY
        # =========================
        else:
            destination = (
                req.location.city
                if req.location and req.location.city
                else await extract_city_from_db(db, req.message)
            )

            if not destination:
                return ChatResponse(
                    conversation_id=conversation_id,
                    response="Please specify a destination city or allow location access.",
                    type=ChatResponseType.TEXT,
                )

            places = await rag_retriever.search_places(
                db=db,
                query=destination,
                limit=12,
            )
            if not places:
                return ChatResponse(
                    conversation_id=conversation_id,
                    response="I couldn't find enough places.",
                    type=ChatResponseType.TEXT,
                )

        # =========================
        # PARSE ITINERARY
        # =========================
        days = extract_days(req.message)

        itinerary_draft = convert_ai_response_to_itinerary(
            ai_text=answer_en,   # 🔥 use ENGLISH version
            city=destination,
            places=places,
            # days=days,
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
        itinerary_proposal=itinerary_proposal,
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
