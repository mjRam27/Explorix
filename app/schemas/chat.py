# schemas/chat.py
from pydantic import BaseModel
from typing import Optional, Dict, Any
from enum import Enum
from datetime import date


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


class ItineraryProposalMeta(BaseModel):
    destination: str
    suggested_days: int


class ChatResponse(BaseModel):
    conversation_id: str
    response: str
    type: ChatResponseType = ChatResponseType.TEXT

    # Present ONLY when type == ITINERARY_PROPOSAL
    itinerary_proposal: Optional[Dict[str, Any]] = None


class CommitItineraryProposalRequest(BaseModel):
    conversation_id: str
    proposal_id: str
    start_date: date


class CommitItineraryProposalResponse(BaseModel):
    status: str
    itinerary_id: str
