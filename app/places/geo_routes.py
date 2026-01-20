# places/geo_routes.py
from fastapi import APIRouter, Query, Depends
from sqlalchemy.sql import text
from sqlalchemy.ext.asyncio import AsyncSession
from db.postgres import get_db
from core.dependencies import get_current_user

router = APIRouter(prefix="/geo", tags=["Geo"])

@router.get("/nearby")
async def nearby_features(
    lat: float,
    lon: float,
    radius_km: int = Query(5, ge=1, le=50),
    category: str | None = None,
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),  # 🔒 AUTH
):
    sql = """
    SELECT
        id,
        title,
        category,
        ST_Y(geo::geometry) AS latitude,
        ST_X(geo::geometry) AS longitude,
        ROUND(
            (ST_Distance(
                geo,
                ST_MakePoint(:lon, :lat)::geography
            ) / 1000)::numeric,
            2
        ) AS distance_km,
        CONCAT(
            'https://www.google.com/maps/dir/?api=1',
            '&origin=', :lat, ',', :lon,
            '&destination=', ST_Y(geo::geometry), ',', ST_X(geo::geometry),
            '&travelmode=walking'
        ) AS map_url
    FROM poi
    WHERE geo IS NOT NULL
      AND ST_DWithin(
          geo,
          ST_MakePoint(:lon, :lat)::geography,
          :radius
      )
    """

    params = {
        "lat": lat,
        "lon": lon,
        "radius": radius_km * 1000,
        "limit": limit,
    }

    if category:
        sql += " AND category ILIKE :category"
        params["category"] = f"%{category}%"

    sql += " ORDER BY distance_km LIMIT :limit"

    result = await db.execute(text(sql), params)
    return [dict(row._mapping) for row in result.fetchall()]
