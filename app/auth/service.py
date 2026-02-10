# auth/service.py
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
        print("🔵 REGISTER START")

        print("🔵 checking existing user")
        existing = await UserRepository.get_by_email(db, email)
        print("🔵 existing user:", existing)

        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )

        normalized_name = (name or "").strip()
        if normalized_name:
            existing_name = await UserRepository.get_by_name(db, normalized_name)
            if existing_name:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username already taken",
                )

        print("🔵 hashing password")
        password_hash = hash_password(password)
        print("🔵 password hashed")

        user_id = uuid4()
        print("🔵 creating user:", user_id)

        await UserRepository.create_user(
            db,
            user_id,
            email,
            password_hash,
            normalized_name or None,
            country_code,
        )

        print("🔵 user created, generating token")

        token = create_access_token(str(user_id), email)
        print("🟢 REGISTER END")

        return token

    @staticmethod
    async def login(db, email, password):
        user = await UserRepository.get_by_email(db, email)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials",
            )

        if not verify_password(password, user["hashed_password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials",
            )

        return create_access_token(str(user["id"]), user["email"])
