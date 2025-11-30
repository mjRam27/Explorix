import pandas as pd
from fastapi import APIRouter, Query, HTTPException
import os
import numpy as np
from math import radians, sin, cos, sqrt, atan2

router = APIRouter(prefix="/pois", tags=["POIs"])

DATA_PATH = "data/Baden-Württemberg_pois.csv"


def load_data():
    """Load and clean the POI dataset."""
    if not os.path.exists(DATA_PATH):
        raise HTTPException(status_code=404, detail=f"Dataset not found at {DATA_PATH}")

    df = pd.read_csv(DATA_PATH)

    # Normalize and clean up columns
    expected_cols = ["name", "category", "lat", "lon", "state", "sunrise", "sunset"]
    for col in expected_cols:
        if col not in df.columns:
            df[col] = ""

    # Handle NaN/inf
    df = df.replace([np.inf, -np.inf], np.nan).fillna("")

    # Ensure correct types
    df["category"] = df["category"].astype(str).str.lower().str.strip()
    df["state"] = df["state"].astype(str).str.lower().str.strip()
    df["name"] = df["name"].astype(str).str.strip()

    return df


@router.get("/")
def get_pois(
    category: str | None = Query(None, description="Filter by category (e.g., 'lakes', 'parks', 'restaurants')"),
    state: str | None = Query(None, description="Filter by state (e.g., 'baden' or 'baden-württemberg')"),
    limit: int = Query(20, description="Maximum number of results to return")
):
    """Get filtered list of POIs."""
    df = load_data()

    # Apply filters flexibly
    if category:
        df = df[df["category"].str.contains(category.lower(), na=False)]
    if state:
        df = df[df["state"].str.contains(state.lower(), na=False)]

    if df.empty:
        return {"message": "No POIs found for the given filters."}

    # Replace remaining NaN or inf before returning
    df = df.replace([np.inf, -np.inf], np.nan).fillna("")

    # Return cleaned subset
    return df.head(limit).to_dict(orient="records")


@router.get("/categories")
def list_categories():
    """List all unique categories available in the dataset."""
    df = load_data()
    unique_categories = sorted(df["category"].dropna().unique().tolist())
    return {"categories": unique_categories, "count": len(unique_categories)}


@router.get("/columns")
def get_columns():
    """Return dataset column names and a sample preview."""
    try:
        df = load_data()
        return {
            "columns": list(df.columns),
            "sample": df.head(5).to_dict(orient="records"),
            "path_checked": os.path.abspath(DATA_PATH)
        }
    except Exception as e:
        return {"error": str(e), "path_checked": os.path.abspath(DATA_PATH)}




@router.get("/nearby")
def get_nearby_pois(
    lat: float = Query(..., description="Latitude of the center point"),
    lon: float = Query(..., description="Longitude of the center point"),
    radius: float = Query(10, description="Radius in kilometers"),
    category: str | None = Query(None, description="Optional category filter (e.g., 'lakes')")
):
    """Find POIs within a given radius of the provided coordinates."""
    df = load_data()

    # Filter by category if provided
    if category:
        df = df[df["category"].str.contains(category.lower(), na=False)]

    # Convert lat/lon columns to numeric
    df["lat"] = pd.to_numeric(df["lat"], errors="coerce")
    df["lon"] = pd.to_numeric(df["lon"], errors="coerce")
    df = df.dropna(subset=["lat", "lon"])

    # Haversine formula to calculate distance (km)
    def haversine(lat1, lon1, lat2, lon2):
        R = 6371  # Earth radius in km
        dlat = radians(lat2 - lat1)
        dlon = radians(lon2 - lon1)
        a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
        c = 2 * atan2(sqrt(a), sqrt(1 - a))
        return R * c

    df["distance_km"] = df.apply(lambda row: haversine(lat, lon, row["lat"], row["lon"]), axis=1)

    nearby = df[df["distance_km"] <= radius].sort_values(by="distance_km")

    if nearby.empty:
        return {"message": f"No POIs found within {radius} km."}

    return nearby.head(30).to_dict(orient="records")
