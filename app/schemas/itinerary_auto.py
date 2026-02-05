from pydantic import BaseModel, Field


class ItineraryAutoRequest(BaseModel):
    destination: str = Field(..., min_length=2, max_length=200)
    days: int = Field(..., ge=1, le=14)
    style: str = Field(default="fun", pattern="^(adventurous|relaxing|fun)$")
