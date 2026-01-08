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
    # TEMP until auth is added
    user_id = "demo_user"

    # 1. Conversation handling
    if req.conversation_id is None:
        conversation_id = create_conversation(user_id)
    else:
        conversation_id = req.conversation_id

    # 2. Build RAG-aware messages (THIS WAS MISSING)
    messages = await build_messages_for_llm(
        db=db,
        conversation_id=conversation_id,
        question=req.question
    )

    # 3. AI response
    answer = generate_explorix_response(messages)

    # 4. Persist messages
    append_message(conversation_id, "user", req.question)
    append_message(conversation_id, "assistant", answer)

    return {
        "conversation_id": conversation_id,
        "response": answer
    }
