# Pure logic only (no FastAPI)
from pymongo import MongoClient
from datetime import datetime
from bson import ObjectId
import os
from dotenv import load_dotenv

load_dotenv()
MONGO_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGO_URI)
db = client["Vbb_transport"]
user_logs = db["user_logs"]
journey_logs = db["journey_logs"]

def log_user_journey(user_id: str, from_station: str, to_station: str, journey_id: str):
    user_logs.insert_one({
        "user_id": "user123",
        "from": from_station,
        "to": to_station,
        "timestamp": datetime.utcnow(),
        "journey_id": ObjectId(journey_id)
    })

def get_user_history(user_id: str):
    logs = list(user_logs.find({"user_id": user_id}))
    journey_ids = [log["journey_id"] for log in logs]

    journeys = journey_logs.find({"_id": {"$in": journey_ids}})
    journeys_by_id = {j["_id"]: j for j in journeys}

    history = []
    for log in logs:
        j = journeys_by_id.get(log["journey_id"])
        if j:
            j["viewed_at"] = log["timestamp"]
            j["from"] = log["from"]
            j["to"] = log["to"]
            history.append(j)

    return history
