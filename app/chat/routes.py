# chat/routes.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from schemas.chat import ChatRequest, ChatResponse
from ai.llama_client import generate_from_llama
from chat.service import (
    create_conversation,
    append_message,
    build_messages_for_llm
)
from db.postgres import get_db
from utils.translation import translate_back

router = APIRouter(prefix="/explorix", tags=["Chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat(
    req: ChatRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Multilingual Explorix Chat:
    - Auto language detection
    - Translate → English → LLM → Translate back
    - RAG grounded strictly in DB
    """

    # TODO: replace with JWT user_id later
    user_id = "demo_user"

    # 1. Conversation handling
    if req.conversation_id is None:
        conversation_id = create_conversation(user_id)
    else:
        conversation_id = req.conversation_id

    # 2. Build messages (translated → EN)
    messages, user_lang = await build_messages_for_llm(
        db=db,
        conversation_id=conversation_id,
        user_message=req.message,
        location=req.location
    )

    # 3. Generate response from LLM (EN)
    answer_en = await generate_from_llama(messages)

    # 4. Translate back to user language (if needed)
    final_answer = translate_back(answer_en, user_lang)

    # 5. Persist conversation (store original language)
    append_message(conversation_id, "user", req.message)
    append_message(conversation_id, "assistant", final_answer)

    return ChatResponse(
        conversation_id=conversation_id,
        response=final_answer
    )
