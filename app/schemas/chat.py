from pydantic import BaseModel
from typing import Optional


class Location(BaseModel):
    lat: float
    lng: float


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    location: Optional[Location] = None


class ChatResponse(BaseModel):
    conversation_id: str
    response: str
