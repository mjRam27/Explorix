

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
# ---- Import domain routers ----
from auth.routes import router as auth_router
from chat.routes import router as chat_router

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
app.include_router(auth_router)
app.include_router(chat_router)

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