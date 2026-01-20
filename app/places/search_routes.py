# places/search_routes.py
from fastapi import APIRouter, Query, Depends
from places.location_service import search_location
from core.dependencies import get_current_user

router = APIRouter(prefix="/search", tags=["Search"])

@router.get("/location")
async def search_location_api(
    query: str = Query(...),
    current_user = Depends(get_current_user),  # 🔒 AUTH
):
    result = search_location(query)
    if not result:
        return {"message": "Location not found"}
    return result
