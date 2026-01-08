# chat/routes.py

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from schemas.chat import ChatRequest, ChatResponse
from ai.inference import generate_explorix_response
from chat.service import (
    create_conversation,
    append_message,
    build_messages_for_llm
)
from db.postgres import get_db

router = APIRouter(prefix="/explorix", tags=["Chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat(
    req: ChatRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Main chat endpoint for Explorix.
    - MongoDB: conversation memory
    - Postgres: conditional RAG (POIs / geo / transport)
    """

    # TODO: replace with real user_id from JWT auth
    user_id = "demo_user"

    # 1. Conversation handling
    if req.conversation_id is None:
        conversation_id = create_conversation(user_id)
    else:
        conversation_id = req.conversation_id

    # 2. Build messages for LLM (history + optional RAG context)
    messages = await build_messages_for_llm(
        db=db,
        conversation_id=conversation_id,
        message=req.message,
        location=req.location
    )

    # Safety fallback (should rarely trigger)
    if not messages:
        messages = [
            {"role": "user", "content": req.message}
        ]

    # 3. Generate AI response
    answer = generate_explorix_response(messages)

    # 4. Persist conversation (MongoDB)
    append_message(conversation_id, "user", req.message)
    append_message(conversation_id, "assistant", answer)

    # 5. Return response
    return ChatResponse(
        conversation_id=conversation_id,
        response=answer
    )
