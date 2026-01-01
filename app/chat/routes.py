# app/chat/routes.py
from fastapi import APIRouter
from pydantic import BaseModel
from ai.inference import generate_explorix_response

router = APIRouter(prefix="/explorix", tags=["Chat"])

class ChatRequest(BaseModel):
    question: str

@router.post("/chat")
async def chat(req: ChatRequest, user_id: str = "demo_user"):
    # 1. Create conversation if missing
    if not req.conversation_id:
        conversation_id = create_conversation(user_id)
    else:
        conversation_id = req.conversation_id

    # 2. Get last messages
    history = get_conversation_history(conversation_id)

    # 3. Generate response
    answer = generate_explorix_response(
        req.question,
        history=history
    )

    # 4. Store messages
    append_message(conversation_id, "user", req.question)
    append_message(conversation_id, "assistant", answer)

    return {
        "conversation_id": conversation_id,
        "response": answer
    }
