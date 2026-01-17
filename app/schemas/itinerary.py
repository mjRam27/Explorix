# schemas/itinerary.py
from pydantic import BaseModel, Field
from pydantic.functional_validators import model_validator
from typing import List, Optional
from datetime import date, datetime
from uuid import UUID


# =====================================================
# PLACE INSIDE A DAY
# =====================================================

class ItineraryPlaceSchema(BaseModel):
    place_id: int                      # ✅ MATCHES poi.id
    order: int = Field(..., ge=1)
    start_time: Optional[str] = Field(
        None, pattern=r"^([01]\d|2[0-3]):[0-5]\d$"
    )
    duration_minutes: int = Field(default=60, ge=15, le=480)
    notes: Optional[str] = None


# =====================================================
# DAY PLAN
# =====================================================

class ItineraryDaySchema(BaseModel):
    day: int = Field(..., ge=1)
    date: date
    title: Optional[str] = None
    places: List[ItineraryPlaceSchema]
    notes: Optional[str] = None

    @model_validator(mode="after")
    def validate_place_order(self):
        orders = [p.order for p in self.places]
        if orders and sorted(orders) != list(range(1, len(orders) + 1)):
            raise ValueError("Place order must be sequential starting from 1")
        return self


# =====================================================
# AI ITINERARY GENERATION REQUEST
# =====================================================

class ItineraryGenerateRequest(BaseModel):
    destination: str = Field(..., min_length=2, max_length=200)
    start_date: date
    end_date: date

    interests: List[str] = []
    pace: str = Field(default="moderate", pattern="^(slow|moderate|fast)$")
    budget: str = Field(default="mid-range", pattern="^(budget|mid-range|luxury)$")

    constraints: Optional[str] = None
    group_size: int = Field(default=1, ge=1, le=20)

    @model_validator(mode="after")
    def validate_dates(self):
        if self.end_date < self.start_date:
            raise ValueError("end_date must be after start_date")
        if (self.end_date - self.start_date).days > 30:
            raise ValueError("Maximum itinerary duration is 30 days")
        return self


# =====================================================
# MANUAL ITINERARY CREATION
# =====================================================

class ItineraryCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=300)
    description: Optional[str] = None
    destination: str = Field(..., min_length=2, max_length=200)

    start_date: date
    end_date: date
    days: List[ItineraryDaySchema]

    travel_style: Optional[str] = None
    budget: Optional[str] = None
    tags: List[str] = []
    is_public: bool = False

    @model_validator(mode="after")
    def validate_days_match_range(self):
        expected = (self.end_date - self.start_date).days + 1
        if len(self.days) != expected:
            raise ValueError(f"Expected {expected} day plans, got {len(self.days)}")
        return self


# =====================================================
# UPDATE ITINERARY
# =====================================================

class ItineraryUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    days: Optional[List[ItineraryDaySchema]] = None
    is_public: Optional[bool] = None
    status: Optional[str] = Field(
        None, pattern="^(draft|published|archived)$"
    )


# =====================================================
# ADD PLACE
# =====================================================

class AddPlaceRequest(BaseModel):
    place_id: int                      # ✅ MATCHES poi.id
    day_number: int = Field(..., ge=1)
    order: Optional[int] = Field(None, ge=1)
    start_time: Optional[str] = None
    duration_minutes: int = Field(default=60, ge=15, le=480)
    notes: Optional[str] = None


# =====================================================
# RESPONSE
# =====================================================

class ItineraryResponse(BaseModel):
    id: UUID
    user_id: UUID

    title: str
    destination: Optional[str] = None

    duration_days: int
    days: List[ItineraryDaySchema]

    tags: List[str] = []
    status: str = "draft"
    is_public: bool = False
    save_count: int = 0
    view_count: int = 0

    travel_style: Optional[str] = None
    budget: Optional[str] = None

    ai_generated: bool = False

    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
