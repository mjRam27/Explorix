from pydantic import BaseModel, Field
from datetime import date


class ItineraryFromTextRequest(BaseModel):
    destination: str = Field(..., min_length=2)
    start_date: date
    text_plan: str = Field(..., min_length=20)
