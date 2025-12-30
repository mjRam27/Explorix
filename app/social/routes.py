from fastapi import APIRouter, UploadFile, Form, Query
from app.social.service import (
    find_nearby_users,
    upload_post,
    get_posts
)

router = APIRouter(prefix="/social", tags=["Social"])


@router.get("/connect")
def connect_users(
    lat: float,
    lon: float,
    radius_km: int = Query(10)
):
    return {
        "radius_km": radius_km,
        "nearby_users": find_nearby_users(lat, lon, radius_km),
    }


@router.post("/feeds/upload")
async def upload_feed(
    user_id: str = Form(...),
    caption: str = Form(...),
    file: UploadFile = None
):
    path = upload_post(user_id, caption, file)
    return {"status": "success", "path": path}


@router.get("/feeds")
def list_feeds():
    return get_posts()
