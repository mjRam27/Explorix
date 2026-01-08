# from fastapi import FastAPI, Query
# from typing import Optional
# from services.journey_service import fetch_journey
# from services.refresh_service import refresh_journey
# from app.utils.resolve import get_station_id
# from services.departure_service import fetch_departures
# from fastapi.middleware.cors import CORSMiddleware
# from pymongo import MongoClient
# import os
# from dotenv import load_dotenv
# from app.transport.station_suggestions import router as suggest_router
# from services.user_history import router as user_history_router
# from services.log_journey import router as log_router
# # from utils.db_neo4j import neo4j_conn
# from services.route_service import find_shortest_route
# from services.pois import router as pois_router
# from services.itinerary import router as itinerary_router
# from services.feeds_service import router as feeds_router
# from services.connect_service import router as connect_router
# from services.profile_service import router as profile_router
# from routes.search import router as search_router
# from services import pois, geo_features
# from routes.explorix_chat import router as explorix_router


# app = FastAPI()
# load_dotenv()
# MONGO_URI = os.getenv("MONGO_URI")
# client = MongoClient(MONGO_URI)
# db = client["Vbb_transport"]
# station_collection = db["station_logs"]

# # CORS setup for frontend
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )
# app.include_router(suggest_router)
# app.include_router(user_history_router)
# app.include_router(log_router)
# app.include_router(pois_router)
# app.include_router(itinerary_router)
# app.include_router(feeds_router)
# app.include_router(connect_router)
# app.include_router(profile_router)
# app.include_router(search_router)
# app.include_router(pois.router)
# app.include_router(geo_features.router)
# app.include_router(explorix_router)

# @app.on_event("startup")
# async def startup_event():
#     print("FastAPI is starting up...")
    
# def shutdown_event():
#     neo4j_conn.close()
#     print("Neo4j connection closed cleanly.")


# @app.get("/")
# def root():
#     return {"message": "VBB Transport API is running!"}


# @app.get("/journey")
# def journey(
#     from_station: str,
#     to_station: str,
#     products: Optional[list[str]] = Query(default=None, alias="products[]"),
#     departure: Optional[str] = None,
#     user_id: Optional[str] = None
# ):
#     from_id = get_station_id(from_station) if not from_station.isdigit() else from_station
#     to_id = get_station_id(to_station) if not to_station.isdigit() else to_station
#     return fetch_journey(from_id, to_id, products, departure=departure, user_id=user_id)


# @app.get("/journey/refresh")
# def refresh(token: str):
#     return refresh_journey(token)


# @app.get("/stations")
# def get_stations():
#     stations = list(station_collection.find({}, {"_id": 0, "station_id": 1, "name": 1}))
#     return {"stations": stations}


# @app.get("/departures")
# def get_departures(station_id: str, duration: int = 60):
#     return fetch_departures(station_id, duration)





# @app.get("/route")
# def get_route(start_station: str, end_station: str):
#     return find_shortest_route(start_station, end_station)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
# ---- Import domain routers ----
# from app.auth.routes import router as auth_router
# from chat.routes import router as chat_router

# from app.places.poi_routes import router as poi_router
# from app.places.geo_routes import router as geo_router
# from app.places.search_routes import router as search_router

from transport.routes import router as transport_router
from history.routes import router as history_router
from social.routes import router as social_router
from itinerary.routes import router as itinerary_router
from places.router import router as places_router




# ---- Create FastAPI app ----
app = FastAPI(
    title="Explorix API",
    version="1.0.0",
    description="Backend for Explorix – transport, places, social, and AI chat"
)

# ---- CORS (frontend support) ----
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten later if needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Register routers ----
# app.include_router(auth_router)
# app.include_router(chat_router)

# app.include_router(poi_router)
# app.include_router(geo_router)
# app.include_router(search_router)
app.include_router(places_router)
app.include_router(transport_router)
app.include_router(history_router)
app.include_router(social_router)
app.include_router(itinerary_router)

# ---- Health check ----
@app.get("/")
def root():
    return {"status": "Explorix backend running"}

# -------------------------------
# Application entry point
# -------------------------------
if __name__ == "__main__":
    uvicorn.run(
        "main:app",   # ✅ correct import path
        host="0.0.0.0",
        port=8080,
        log_level="info",
        # reload=True,      # optional (dev only)
    )