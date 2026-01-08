# app/places/router.py
from fastapi import APIRouter
from places.poi_routes import router as poi_router
from places.geo_routes import router as geo_router
from places.search_routes import router as search_router

router = APIRouter(prefix="/places", tags=["Places"])

router.include_router(poi_router)
router.include_router(geo_router)
router.include_router(search_router)
