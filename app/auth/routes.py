# auth/routes.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from core.dependencies import get_current_user
from schemas.auth import UserCreate, UserLogin, TokenResponse, UserPublic
from auth.service import AuthService
from db.postgres import get_db

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=TokenResponse)
async def register(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    token = await AuthService.register(
        db,
        payload.email,
        payload.password,
        payload.name,
        payload.country_code,
    )
    return {
        "access_token": token,
        "token_type": "bearer",
    }


@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLogin, db: AsyncSession = Depends(get_db)):
    token = await AuthService.login(
        db,
        payload.email,
        payload.password,
    )
    return {
        "access_token": token,
        "token_type": "bearer",
    }


@router.get("/me", response_model=UserPublic)
async def get_me(current_user=Depends(get_current_user)):
    return {
        "user_id": current_user["id"],
        "email": current_user["email"],
        "created_at": current_user["created_at"],
    }
