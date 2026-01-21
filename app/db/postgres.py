# app/db/postgres.py

import os
from typing import AsyncGenerator
from dotenv import load_dotenv

from sqlalchemy.ext.asyncio import (
    create_async_engine,
    async_sessionmaker,
    AsyncSession,
)
from sqlalchemy.orm import declarative_base

# =====================================================
# BASE (REQUIRED FOR MODELS)
# =====================================================

Base = declarative_base()

# =====================================================
# FORCE .env LOADING
# =====================================================

BASE_DIR = os.path.dirname(os.path.dirname(__file__))  # app/
ENV_PATH = os.path.join(BASE_DIR, ".env")

print(">>> LOADING ENV FROM:", ENV_PATH)
load_dotenv(ENV_PATH)

# =====================================================
# ENV VARIABLES
# =====================================================

POSTGRES_USER = os.getenv("POSTGRES_USER")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD")
POSTGRES_HOST = os.getenv("POSTGRES_HOST")
POSTGRES_PORT = os.getenv("POSTGRES_PORT")
POSTGRES_DB = os.getenv("POSTGRES_DB")

if not all([POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB]):
    raise RuntimeError("❌ Postgres environment variables are NOT loaded")

# =====================================================
# DATABASE URL
# =====================================================

DATABASE_URL = (
    f"postgresql+asyncpg://{POSTGRES_USER}:"
    f"{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
)

# =====================================================
# ENGINE & SESSION
# =====================================================

engine = create_async_engine(
    DATABASE_URL,
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    expire_on_commit=False,
)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session

    
# 🔑 FORCE MODEL REGISTRATION FOR SQLALCHEMY
from auth.models import User
from itinerary.models import Itinerary, ItineraryPlace
from places.models import Place
