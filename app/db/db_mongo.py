# app/db/db_mongo.py
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGO_URI)

db = client["Explorix"]
# keep consistent name

# -------- Collections --------
station_logs = db["station_logs"]
user_logs = db["user_logs"]
journey_logs = db["journey_logs"]
posts = db["posts"]
itineraries = db["itineraries"]
users = db["users"]
conversations = db["conversations"]

# -------- Generic helpers --------
def log_trip(data: dict, collection_name: str):
    db[collection_name].insert_one(data)

# -------- Transport helpers --------
def get_station_logs(filter_query=None, limit=10):
    query = filter_query or {}

    docs = station_logs.find(
        query,
        {"_id": 0, "station_id": 1, "name": 1}
    ).limit(limit)

    return [
        {"id": d["station_id"], "name": d["name"]}
        for d in docs
    ]
