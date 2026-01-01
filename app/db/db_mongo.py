# app/db/db_mongo.py
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGO_URI)

db = client["vbb_db"]   # keep consistent name

# -------- Collections --------
station_logs = db["station_logs"]
user_logs = db["user_logs"]
journey_logs = db["journey_logs"]
posts = db["posts"]
itineraries = db["itineraries"]
users = db["users"]

# -------- Generic helpers --------
def log_trip(data: dict, collection_name: str):
    db[collection_name].insert_one(data)

# -------- Transport helpers --------
def get_station_logs():
    return list(
        station_logs.find(
            {},
            {"_id": 0, "station_id": 1, "name": 1}
        )
    )
