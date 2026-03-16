# places/geo_routes.py
from fastapi import APIRouter, Query, Depends, HTTPException
from sqlalchemy.sql import text
from sqlalchemy.ext.asyncio import AsyncSession
from db.postgres import get_db
from core.dependencies import get_current_user
import os
import requests

router = APIRouter(prefix="/geo", tags=["Geo"])

MAIN_CATEGORIES = {
    "food",
    "services",
    "nature",
    "culture",
    "shopping",
    "stay",
    "entertainment",
    "sports",
}

SUBCATEGORY_MAIN_CATEGORY_MAP = {
    "events": "entertainment",
    "nightlife": "entertainment",
    "wellness": "stay",
    "normal": "services",
}


def _split_categories(raw: str | None) -> tuple[list[str], list[str]]:
    if not raw:
        return [], []

    canonical: list[str] = []
    keywords: list[str] = []
    for token in [c.strip().lower() for c in raw.split(",") if c.strip()]:
        mapped = SUBCATEGORY_MAIN_CATEGORY_MAP.get(token, token)
        if mapped in MAIN_CATEGORIES:
            canonical.append(mapped)
        else:
            keywords.append(token)
    return canonical, keywords

@router.get("/nearby")
async def nearby_features(
    lat: float,
    lon: float,
    radius_km: int = Query(5, ge=1, le=80),
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

    canonical_categories, keyword_filters = _split_categories(category)
    if canonical_categories:
        sql += " AND main_category = ANY(:main_categories)"
        params["main_categories"] = canonical_categories

    if keyword_filters:
        sql += " AND (" + " OR ".join(
            [f"category ILIKE :cat{i}" for i in range(len(keyword_filters))]
        ) + ")"
        for i, token in enumerate(keyword_filters):
            params[f"cat{i}"] = f"%{token}%"

    sql += " ORDER BY distance_km LIMIT :limit"

    result = await db.execute(text(sql), params)
    return [dict(row._mapping) for row in result.fetchall()]


@router.get("/route")
async def route_to_place(
    origin_lat: float,
    origin_lng: float,
    dest_lat: float,
    dest_lng: float,
    mode: str = Query("walking"),
    current_user = Depends(get_current_user),  # 🔒 AUTH
):
    api_key = os.getenv("GOOGLE_MAPS_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Google Maps API key not configured")

    url = "https://maps.googleapis.com/maps/api/directions/json"
    params = {
        "origin": f"{origin_lat},{origin_lng}",
        "destination": f"{dest_lat},{dest_lng}",
        "mode": mode,
        "key": api_key,
    }

    try:
        resp = requests.get(url, params=params, timeout=10)
        data = resp.json()
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Failed to fetch route") from exc

    route = (data.get("routes") or [None])[0]
    if not route:
        return {"polyline": None, "distance_text": None, "duration_text": None}

    leg = (route.get("legs") or [None])[0]
    return {
        "polyline": route.get("overview_polyline", {}).get("points"),
        "distance_text": leg.get("distance", {}).get("text") if leg else None,
        "duration_text": leg.get("duration", {}).get("text") if leg else None,
    }
