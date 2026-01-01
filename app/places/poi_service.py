# app/places/poi_routes.py
from fastapi import APIRouter, Query, HTTPException, Depends
from sqlalchemy.sql import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.postgres import get_db

router = APIRouter(prefix="/pois", tags=["POIs"])

@router.get("/")
async def get_pois(
    category: str | None = Query(None),
    city: str | None = Query(None),
    poi_type: str | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    sql = """
    SELECT
        id,
        title,
        category,
        poi_type,
        rating,
        city,
        state,
        website
    FROM poi
    WHERE 1=1
    """

    params = {}

    if category:
        sql += " AND category ILIKE :category"
        params["category"] = f"%{category}%"

    if city:
        sql += " AND city ILIKE :city"
        params["city"] = f"%{city}%"

    if poi_type:
        sql += " AND poi_type = :poi_type"
        params["poi_type"] = poi_type

    sql += """
    ORDER BY rating DESC NULLS LAST
    LIMIT :limit
    """
    params["limit"] = limit

    result = await db.execute(text(sql), params)
    rows = result.fetchall()

    if not rows:
        return {"message": "No POIs found"}

    return [dict(row._mapping) for row in rows]
