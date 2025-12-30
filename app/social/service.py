import os
import uuid
import shutil
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

client = MongoClient(os.getenv("MONGO_URI"))
db = client["Vbb_transport"]

users_col = db["users"]
posts_col = db["posts"]

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def find_nearby_users(lat: float, lon: float, radius_km: int):
    # Mock logic for now
    return [
        {"user_id": "u101", "name": "Anna", "distance_km": 2.3},
        {"user_id": "u102", "name": "Felix", "distance_km": 4.7},
    ]


def upload_post(user_id: str, caption: str, file):
    filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    post = {
        "user_id": user_id,
        "caption": caption,
        "media_url": f"/{file_path}",
    }
    posts_col.insert_one(post)

    return file_path


def get_posts():
    return list(posts_col.find({}, {"_id": 0}))
