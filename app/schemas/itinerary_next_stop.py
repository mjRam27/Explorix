from pydantic import BaseModel


class NextStopItem(BaseModel):
    id: int
    title: str
    latitude: float
    longitude: float
    category: str | None = None

