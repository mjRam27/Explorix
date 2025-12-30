from fastapi import APIRouter, Body
from app.itinerary.service import (
    add_itinerary,
    get_user_itineraries
)

router = APIRouter(prefix="/itinerary", tags=["Itinerary"])


@router.post("/add")
def create_itinerary(data: dict = Body(...)):
    itinerary_id = add_itinerary(data)
    return {"status": "success", "id": itinerary_id}


@router.get("/user/{user_id}")
def list_user_itineraries(user_id: str):
    return get_user_itineraries(user_id)
