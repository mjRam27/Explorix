# app/places/poi_service.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import text

async def get_pois_by_city(
    db: AsyncSession,
    city: str,
    limit: int = 5
) -> list[dict]:
    sql = """
    SELECT
        title,
        category,
        poi_type,
        rating,
        city
    FROM poi
    WHERE city ILIKE :city
    ORDER BY rating DESC NULLS LAST
    LIMIT :limit
    """

    result = await db.execute(
        text(sql),
        {
            "city": f"%{city}%",
            "limit": limit
        }
    )

    rows = result.fetchall()
    return [dict(row._mapping) for row in rows]
