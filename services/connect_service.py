from fastapi import APIRouter, Query
from utils.db_mongo import db

router = APIRouter(prefix="/connect", tags=["Connect"])
users = db["users"]

@router.get("/")
def find_nearby(lat: float, lon: float, radius_km: int = 10):
    """Find users in radius (mock for now)"""
    return {
        "radius_km": radius_km,
        "nearby_users": [
            {"user_id": "u101", "name": "Anna", "distance_km": 2.3},
            {"user_id": "u102", "name": "Felix", "distance_km": 4.7},
        ],
    }
