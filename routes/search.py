from fastapi import APIRouter, Query
from services.location_search import search_location

router = APIRouter(prefix="/search", tags=["Search"])

@router.get("/location")
def search_location_api(query: str = Query(...)):
    result = search_location(query)
    if not result:
        return {"message": "Location not found"}
    return result
