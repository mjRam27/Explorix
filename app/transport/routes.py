from fastapi import APIRouter, Query
from typing import Optional

from transport.journey_service import fetch_journey
from transport.refresh_service import refresh_journey
from transport.departure_service import fetch_departures
from transport.route_service import find_shortest_route
from utils.resolve import get_station_id
from db.db_mongo import get_station_logs  # helper, not raw client

router = APIRouter(prefix="/transport", tags=["Transport"])


@router.get("/journey")
def journey(
    from_station: str,
    to_station: str,
    products: Optional[list[str]] = Query(default=None, alias="products[]"),
    departure: Optional[str] = None,
    user_id: Optional[str] = None,
):
    from_id = get_station_id(from_station) if not from_station.isdigit() else from_station
    to_id = get_station_id(to_station) if not to_station.isdigit() else to_station

    return fetch_journey(
        from_id,
        to_id,
        products,
        departure=departure,
        user_id=user_id
    )


@router.get("/journey/refresh")
def refresh(token: str):
    return refresh_journey(token)


@router.get("/stations")
def get_stations():
    return get_station_logs()


@router.get("/departures")
def get_departures(station_id: str, duration: int = 60):
    return fetch_departures(station_id, duration)


@router.get("/route")
def get_route(start_station: str, end_station: str):
    return find_shortest_route(start_station, end_station)
