from fastapi import APIRouter, Body
from utils.db_mongo import db

router = APIRouter(prefix="/itinerary", tags=["Itinerary"])
collection = db["itineraries"]

@router.post("/add")
def add_itinerary(data: dict = Body(...)):
    """Save new itinerary entry"""
    result = collection.insert_one(data)
    return {"status": "success", "id": str(result.inserted_id)}

@router.get("/user/{user_id}")
def get_itinerary(user_id: str):
    """Get all saved itineraries for a user"""
    items = list(collection.find({"user_id": user_id}))
    for i in items:
        i["_id"] = str(i["_id"])
    return items
