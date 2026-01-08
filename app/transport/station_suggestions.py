from fastapi import APIRouter, Query
from typing import List
from pymongo.collection import Collection
from dotenv import load_dotenv
import os
from pymongo import MongoClient

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGO_URI)
db = client["Vbb_transport"]
station_collection: Collection = db["station_logs"]

router = APIRouter()

@router.get("/stations/suggest")
def suggest_stations(q: str = Query(..., min_length=1)) -> List[dict]:
    regex_query = {"$regex": f"^{q}", "$options": "i"}
    result = station_collection.find(
        {"name": regex_query},
        {"_id": 0, "id": 1, "name": 1}
    ).limit(10)
    return list(result)
