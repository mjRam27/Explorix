# auth/repository.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from uuid import UUID

class UserRepository:
    @staticmethod
    async def get_by_email(db: AsyncSession, email: str):
        result = await db.execute(
            text("SELECT * FROM users WHERE email = :email"),
            {"email": email},
        )
        return result.mappings().first()

    @staticmethod
    async def create_user(
        db: AsyncSession,
        user_id: UUID,
        email: str,
        hashed_password: str,
        name: str | None,
        country_code: str | None,
    ):
        await db.execute(
            text("""
                INSERT INTO users (id, email, hashed_password, name, country_code)
                VALUES (:id, :email, :hashed_password, :name, :country_code)
            """),
            {
                "id": user_id,
                "email": email,
                "hashed_password": hashed_password,
                "name": name,
                "country_code": country_code,
            },
        )
        await db.commit()

    @staticmethod
    async def get_by_id(db: AsyncSession, user_id: str):
        result = await db.execute(
            text("""
                SELECT id, email, name, country_code, created_at
                FROM users
                WHERE id = :user_id
            """),
            {"user_id": user_id},
        )
        return result.mappings().first()
