# app/db/init_db.py
import asyncio
from db.postgres import engine, Base

# IMPORT ONLY ORM MODELS YOU OWN
from itinerary.models import Itinerary, ItineraryPlace
from auth.models import User

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Database tables created")

if __name__ == "__main__":
    asyncio.run(init_db())
