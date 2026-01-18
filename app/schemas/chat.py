from pydantic import BaseModel
from typing import Optional, Dict, Any
from enum import Enum


class Location(BaseModel):
    lat: float
    lng: float
    city: Optional[str] = None


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    location: Optional[Location] = None


class ChatResponseType(str, Enum):
    TEXT = "TEXT"
    ITINERARY_PROPOSAL = "ITINERARY_PROPOSAL"


class ChatResponse(BaseModel):
    conversation_id: str
    response: str
    type: ChatResponseType = ChatResponseType.TEXT

    # Present ONLY when type == ITINERARY_PROPOSAL
    itinerary_proposal: Optional[Dict[str, Any]] = None
