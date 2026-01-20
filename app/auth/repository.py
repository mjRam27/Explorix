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
        password_hash: str,
        name: str | None,
        country_code: str | None,
    ):
        await db.execute(
            text("""
                INSERT INTO users (id, email, password_hash, name, country_code)
                VALUES (:id, :email, :password_hash, :name, :country_code)
            """),
            {
                "id": user_id,
                "email": email,
                "password_hash": password_hash,
                "name": name,
                "country_code": country_code,
            },
        )
        await db.commit()

    @staticmethod
    async def get_by_id(db: AsyncSession, user_id: str):
        result = await db.execute(
            text("""
                SELECT id, email, created_at
                FROM users
                WHERE id = :user_id
            """),
            {"user_id": user_id},
        )
        row = result.mappings().first()
        return row
