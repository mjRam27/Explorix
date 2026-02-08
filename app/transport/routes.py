# transport/routes.py
from fastapi import APIRouter, Query
from typing import Optional

from transport.journey_service import (
    fetch_journey,
    fetch_station_suggestions,
    fetch_nearby_stations,
    seed_stations_from_query,
)
from transport.refresh_service import refresh_journey
from transport.departure_service import fetch_departures
from transport.route_service import find_shortest_route
router = APIRouter(prefix="/transport", tags=["Transport"])


@router.get("/journey")
def journey(
    from_station: str,
    to_station: str,
    products: Optional[list[str]] = Query(default=None, alias="products[]"),
    departure: Optional[str] = None,
    user_id: Optional[str] = None,
):
    return fetch_journey(
        from_station,
        to_station,
        products,
        departure=departure,
        user_id=user_id
    )


@router.get("/journey/refresh")
def refresh(token: str):
    return refresh_journey(token)


@router.get("/stations")
def suggest_stations(q: str = Query(..., min_length=1)):
    return fetch_station_suggestions(q, limit=20)


@router.get("/stations/nearby")
def nearby_stations(
    lat: float,
    lon: float,
    results: int = 8,
    distance: int = 3000,
):
    return fetch_nearby_stations(lat=lat, lon=lon, results=results, distance=distance)


@router.post("/stations/seed")
def seed_stations(
    q: str = Query(..., min_length=2),
    limit: int = 50,
):
    return {
        "seeded": seed_stations_from_query(q, limit=max(1, min(limit, 100))),
    }



@router.get("/departures")
def get_departures(station_id: str, duration: int = 60):
    return fetch_departures(station_id, duration)


@router.get("/route")
def get_route(start_station: str, end_station: str):
    return find_shortest_route(start_station, end_station)
