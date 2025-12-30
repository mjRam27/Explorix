# app/chat/routes.py
from fastapi import APIRouter
from pydantic import BaseModel
from app.ai.inference import generate_explorix_response

router = APIRouter(prefix="/explorix", tags=["Chat"])

class ChatRequest(BaseModel):
    question: str

@router.post("/chat")
async def chat(req: ChatRequest):
    answer = generate_explorix_response(req.question)
    return {"response": answer}
