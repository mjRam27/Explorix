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

    return [dict(row._mapping) for row in result.fetchall()]


async def get_pois_near_location(
    db: AsyncSession,
    lat: float,
    lng: float,
    radius_km: float = 2.0,
    limit: int = 5
) -> list[dict]:
    sql = """
    SELECT
        title,
        category,
        ROUND(
            (ST_Distance(
                geo,
                ST_MakePoint(:lng, :lat)::geography
            ) / 1000)::numeric,
            2
        ) AS distance_km
    FROM poi
    WHERE geo IS NOT NULL
      AND ST_DWithin(
          geo,
          ST_MakePoint(:lng, :lat)::geography,
          :radius
      )
    ORDER BY distance_km
    LIMIT :limit
    """

    result = await db.execute(
        text(sql),
        {
            "lat": lat,
            "lng": lng,
            "radius": radius_km * 1000,
            "limit": limit
        }
    )

    return [dict(row._mapping) for row in result.fetchall()]
