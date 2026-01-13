from uuid import uuid4
from passlib.context import CryptContext
from fastapi import HTTPException, status

from .repository import UserRepository
from core.security import create_access_token

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return pwd_context.verify(password, hashed)


class AuthService:
    @staticmethod
    async def register(db, email, password, name, country_code):
        existing = await UserRepository.get_by_email(db, email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )

        user_id = uuid4()
        password_hash = hash_password(password)

        await UserRepository.create_user(
            db,
            user_id,
            email,
            password_hash,
            name,
            country_code,
        )

        token = create_access_token(str(user_id), email)
        return token

    @staticmethod
    async def login(db, email, password):
        user = await UserRepository.get_by_email(db, email)
        if not user or not verify_password(password, user["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials",
            )

        token = create_access_token(str(user["id"]), user["email"])
        return token
