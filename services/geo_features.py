from fastapi import APIRouter, Query
from utils.postgres import SessionLocal
from sqlalchemy.sql import text

router = APIRouter(prefix="/geo", tags=["Geo Features"])

@router.get("/nearby")
def nearby_features(
    lat: float,
    lon: float,
    radius_km: int = 5,
    category: str | None = None,
):
    session = SessionLocal()

    sql = """
    SELECT
        COALESCE(
            name,
            category || ' near ' || state
        ) AS display_name,
        category,
        feature_type,
        (
            ST_Distance(
                location,
                ST_MakePoint(:lon, :lat)::geography
            ) / 1000
        )::numeric(10,2) AS distance_km
    FROM geo_features
    WHERE ST_DWithin(
        location,
        ST_MakePoint(:lon, :lat)::geography,
        :radius
    )
    """

    params = {
        "lat": lat,
        "lon": lon,
        "radius": radius_km * 1000
    }

    if category:
        sql += " AND category ILIKE :category"
        params["category"] = f"%{category}%"

    sql += " ORDER BY distance_km LIMIT 20;"

    result = session.execute(text(sql), params).fetchall()
    session.close()

    return [dict(row._mapping) for row in result]

