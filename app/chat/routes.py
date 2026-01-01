from fastapi import APIRouter
from schemas.chat import ChatRequest, ChatResponse
from ai.inference import generate_explorix_response
from chat.service import (
    create_conversation,
    append_message,
    get_conversation_history
)

router = APIRouter(prefix="/explorix", tags=["Chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    # TEMP until auth is added
    user_id = "demo_user"

    # 1. Conversation handling
    if req.conversation_id is None:
        conversation_id = create_conversation(user_id)
    else:
        conversation_id = req.conversation_id

    # 2. Fetch history
    history = get_conversation_history(conversation_id)

    # 3. AI response
    answer = generate_explorix_response(
        req.question,
        history=history
    )

    # 4. Persist messages
    append_message(conversation_id, "user", req.question)
    append_message(conversation_id, "assistant", answer)

    return {
        "conversation_id": conversation_id,
        "response": answer
    }
