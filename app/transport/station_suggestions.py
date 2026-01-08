# transport/station_suggestions.py
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
    regex_query = {
        "name": {
            "$regex": f"^{q}",
            "$options": "i"
        }
    }
    return get_station_logs(regex_query)

