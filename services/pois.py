from fastapi import APIRouter, Query, HTTPException
from utils.postgres import SessionLocal
from sqlalchemy.sql import text

router = APIRouter(prefix="/pois", tags=["POIs"])


# ---------------------------------------------------------
# GET /pois → List POIs with filters
# ---------------------------------------------------------
@router.get("/")
def get_pois(
    category: str | None = Query(None, description="Filter by category"),
    city: str | None = Query(None, description="Filter by city"),
    poi_type: str | None = Query(None, description="Filter by POI type (stay, food, attraction)"),
    limit: int = Query(20, ge=1, le=100)
):
    session = SessionLocal()

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

    result = session.execute(text(sql), params).fetchall()
    session.close()

    if not result:
        return {"message": "No POIs found"}

    return [dict(row._mapping) for row in result]


# ---------------------------------------------------------
# GET /pois/categories → List available categories
# ---------------------------------------------------------
@router.get("/categories")
def list_categories():
    session = SessionLocal()

    sql = """
    SELECT DISTINCT category
    FROM poi
    WHERE category IS NOT NULL
    ORDER BY category;
    """

    result = session.execute(text(sql)).fetchall()
    session.close()

    return {
        "categories": [row[0] for row in result],
        "count": len(result)
    }


# ---------------------------------------------------------
# GET /pois/{poi_id} → POI detail
# ---------------------------------------------------------
@router.get("/{poi_id}")
def get_poi_detail(poi_id: int):
    session = SessionLocal()

    sql = """
    SELECT *
    FROM poi
    WHERE id = :poi_id
    """

    result = session.execute(
        text(sql),
        {"poi_id": poi_id}
    ).fetchone()

    session.close()

    if not result:
        raise HTTPException(status_code=404, detail="POI not found")

    return dict(result._mapping)


# ---------------------------------------------------------
# GET /pois/search → Text search (fast, explainable)
# ---------------------------------------------------------
@router.get("/search")
def search_poi(
    q: str = Query(..., min_length=2, description="Search text"),
    limit: int = Query(10, ge=1, le=50)
):
    session = SessionLocal()

    sql = """
    SELECT
        id,
        title,
        category,
        city,
        rating
    FROM poi
    WHERE normalized_title ILIKE :q
    ORDER BY rating DESC NULLS LAST
    LIMIT :limit;
    """

    result = session.execute(
        text(sql),
        {
            "q": f"%{q.lower()}%",
            "limit": limit
        }
    ).fetchall()

    session.close()

    return [dict(row._mapping) for row in result]
