from pymongo import MongoClient
from dotenv import load_dotenv
import os
from bson import ObjectId

load_dotenv()

client = MongoClient(os.getenv("MONGO_URI"))
db = client["Vbb_transport"]
collection = db["itineraries"]


def add_itinerary(data: dict):
    result = collection.insert_one(data)
    return str(result.inserted_id)


def get_user_itineraries(user_id: str):
    items = list(collection.find({"user_id": user_id}))
    for i in items:
        i["_id"] = str(i["_id"])
    return items
