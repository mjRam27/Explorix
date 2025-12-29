from fastapi import APIRouter
from pydantic import BaseModel
from model.inference import generate_explorix_response

router = APIRouter()

class ChatRequest(BaseModel):
    question: str

@router.post("/explorix/chat")
def chat(req: ChatRequest):
    answer = generate_explorix_response(req.question)
    return {
        "response": answer
    }
