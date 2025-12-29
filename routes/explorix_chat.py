from fastapi import APIRouter
from pydantic import BaseModel
from model.inference import generate_explorix_response

router = APIRouter()

class ChatRequest(BaseModel):
    question: str

@router.post("/explorix/chat")
def chat(req: ChatRequest):
    prompt = f"""### User:
{req.question}

### Assistant:"""

    answer = generate_explorix_response(prompt)

    return {
        "response": answer
    }
