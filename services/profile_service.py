from fastapi import APIRouter, Body
from utils.db_mongo import db

router = APIRouter(prefix="/profile", tags=["Profile"])
users = db["users"]

@router.post("/update")
def update_profile(data: dict = Body(...)):
    """Create or update a user profile"""
    user_id = data.get("user_id")
    users.update_one({"user_id": user_id}, {"$set": data}, upsert=True)
    return {"status": "updated"}

@router.get("/{user_id}")
def get_profile(user_id: str):
    """Fetch a user's profile"""
    return users.find_one({"user_id": user_id}, {"_id": 0})
