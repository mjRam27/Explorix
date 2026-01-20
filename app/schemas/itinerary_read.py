from pydantic import BaseModel
from typing import List, Optional
from datetime import date
from uuid import UUID


class EnrichedPlace(BaseModel):
    id: int
    name: str                  # 👈 API name
    category: Optional[str]
    rating: Optional[float]
    reviews_count: Optional[int]
    city: Optional[str]
    country_code: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    google_maps_url: Optional[str]
    order: int


class EnrichedDay(BaseModel):
    day: int
    date: date
    title: Optional[str]
    notes: Optional[str]
    places: List[EnrichedPlace]


class ItineraryEnrichedResponse(BaseModel):
    id: UUID
    title: str
    destination: str
    duration_days: int
    days: List[EnrichedDay]
