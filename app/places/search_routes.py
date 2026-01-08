# app/places/poi_routes.py
from fastapi import APIRouter, Query
from places.poi_service import search_location

router = APIRouter(prefix="/search", tags=["Search"])

@router.get("/location")
async def search_location_api(query: str = Query(...)):
    result = search_location(query)
    if not result:
        return {"message": "Location not found"}
    return result
