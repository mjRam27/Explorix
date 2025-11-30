from fastapi import APIRouter, UploadFile, Form
from utils.db_mongo import db
import uuid, os, shutil

router = APIRouter(prefix="/feeds", tags=["Feeds"])
collection = db["posts"]
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_post(
    user_id: str = Form(...),
    caption: str = Form(...),
    file: UploadFile = None
):
    """Upload a post (image/video + caption)"""
    filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    post = {
        "user_id": user_id,
        "caption": caption,
        "media_url": f"/{file_path}"
    }
    collection.insert_one(post)
    return {"status": "success", "path": file_path}

@router.get("/")
def get_posts():
    """Return all posts for feeds"""
    return list(collection.find({}, {"_id": 0}))
