# transport/journey_service.py
import os
from datetime import datetime

import requests
from bson import ObjectId
from dotenv import load_dotenv
from pymongo import MongoClient

from db.db_redis import cache_departure, get_cached_departure
from utils.resolve import get_station_id

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGO_URI)
db = client["Vbb_transport"]
journey_collection = db["journey_logs"]
station_collection = db["station_logs"]
user_collection = db["user_logs"]
TRANSPORT_API_BASE = os.getenv("TRANSPORT_API_BASE", "https://v6.db.transport.rest").rstrip("/")
FALLBACK_TRANSPORT_BASES = [
    TRANSPORT_API_BASE,
    "https://v6.vbb.transport.rest",
]


def _is_station_id(value: str) -> bool:
    text = str(value or "").strip()
    if not text:
        return False
    if ":" in text:
        return True
    return text.isdigit()


def _resolve_station(value: str) -> str:
    text = str(value or "").strip()
    if _is_station_id(text):
        return text
    cached = station_collection.find_one(
        {"name": {"$regex": f"^{text}$", "$options": "i"}},
        {"station_id": 1},
    )
    if cached and cached.get("station_id"):
        return str(cached["station_id"])
    return get_station_id(text)


def fetch_station_suggestions(query: str, limit: int = 20):
    q = str(query or "").strip()
    if not q:
        return []

    payload = None
    params = {"query": q, "results": max(1, min(limit, 30))}
    for base in FALLBACK_TRANSPORT_BASES:
        try:
            url = f"{base.rstrip('/')}/locations"
            response = requests.get(
                url,
                params=params,
                timeout=12,
                headers={"User-Agent": "Explorix-App"},
            )
            response.raise_for_status()
            payload = response.json() or []
            break
        except Exception:
            payload = None

    if payload is None:
        # Degrade gracefully to locally cached station names.
        regex_query = {"name": {"$regex": f"^{q}", "$options": "i"}}
        docs = station_collection.find(
            regex_query,
            {"_id": 0, "station_id": 1, "name": 1, "line": 1},
        ).limit(max(1, min(limit, 30)))
        return [
            {"id": str(d.get("station_id") or d.get("name")), "name": d.get("name"), "line": d.get("line")}
            for d in docs
            if d.get("name")
        ]

    suggestions = []
    for item in payload:
        station_id = item.get("id")
        name = item.get("name")
        if not station_id or not name:
            continue

        products = item.get("products") or {}
        modes = [k for k, enabled in products.items() if enabled]
        line = ", ".join(modes[:3]) if modes else None

        station = {"id": str(station_id), "name": name, "line": line}
        suggestions.append(station)

        station_collection.update_one(
            {"station_id": str(station_id)},
            {
                "$set": {
                    "station_id": str(station_id),
                    "name": name,
                    "line": line,
                }
            },
            upsert=True,
        )

    return suggestions


def fetch_nearby_stations(lat: float, lon: float, results: int = 8, distance: int = 3000):
    payload = None
    params = {
        "latitude": lat,
        "longitude": lon,
        "results": max(1, min(results, 20)),
        "distance": max(100, min(distance, 20000)),
        "stops": "true",
        "poi": "false",
    }
    for base in FALLBACK_TRANSPORT_BASES:
        try:
            url = f"{base.rstrip('/')}/locations/nearby"
            response = requests.get(
                url,
                params=params,
                timeout=12,
                headers={"User-Agent": "Explorix-App"},
            )
            response.raise_for_status()
            payload = response.json() or []
            break
        except Exception:
            payload = None

    if payload is None:
        return []

    stations = []
    for item in payload:
        station_id = item.get("id")
        name = item.get("name")
        if not station_id or not name:
            continue

        products = item.get("products") or {}
        modes = [k for k, enabled in products.items() if enabled]
        line = ", ".join(modes[:3]) if modes else None

        station = {
            "id": str(station_id),
            "name": name,
            "line": line,
            "distance": item.get("distance"),
        }
        stations.append(station)

        station_collection.update_one(
            {"station_id": str(station_id)},
            {
                "$set": {
                    "station_id": str(station_id),
                    "name": name,
                    "line": line,
                }
            },
            upsert=True,
        )

    # Provider ordering may prioritize major stations; enforce nearest-first.
    stations.sort(
        key=lambda s: (
            s.get("distance") is None,
            s.get("distance") if isinstance(s.get("distance"), (int, float)) else 10**9,
        )
    )
    return stations


def seed_stations_from_query(query: str, limit: int = 50):
    # Reuse live suggestions flow and persist into station_logs.
    return fetch_station_suggestions(query, limit=limit)


def fetch_journey(
    from_station: str,
    to_station: str,
    products: list[str] = None,
    date: str = None,
    user_id: str = None,
    departure: str = None,
):
    from_id = _resolve_station(from_station)
    to_id = _resolve_station(to_station)

    cache_key = f"{from_id}:{to_id}:{','.join(products or [])}:{date or ''}"
    cached = get_cached_departure(cache_key)
    if cached:
        print("cache hit:", cache_key)
        return {"status": "cached", "journeys": cached}

    url = f"{TRANSPORT_API_BASE}/journeys"
    params = {
        "from": from_id,
        "to": to_id,
        "stopovers": True,
        "polylines": True,
        "results": 5,
        "language": "en",
        "duration": 90,
        "departure": departure,
    }

    if not products:
        products = ["ALL"]

    # db.transport.rest (hafas) product keys
    product_map = {
        "BUS": ["bus"],
        "TRAM": ["tram"],
        "TRAIN": ["regional", "suburban", "national", "nationalExpress"],
        "ICE": ["nationalExpress"],
        "ALL": [],
    }

    selected = [p.upper() for p in products]
    # For ALL, do not pass products[] at all; provider returns every mode.
    if "ALL" not in selected:
        modes_to_send = []
        for p in selected:
            modes_to_send.extend(product_map.get(p, []))
        # dedupe while preserving order
        seen = set()
        filtered_modes = [
            m for m in modes_to_send if not (m in seen or seen.add(m))
        ]
        if filtered_modes:
            params["products[]"] = filtered_modes

    if date:
        params["departure"] = date

    try:
        response = requests.get(
            url,
            params=params,
            timeout=15,
            headers={"User-Agent": "Explorix-App"},
        )
        response.raise_for_status()
        data = response.json()

        if not data.get("journeys"):
            return {"status": "error", "message": "No journey found"}

        all_journeys = []

        for journey in data["journeys"]:
            legs_info = []
            total_changes = len(journey["legs"]) - 1

            for leg in journey["legs"]:
                origin_loc = leg.get("origin", {}).get("location", {}) or {}
                dest_loc = leg.get("destination", {}).get("location", {}) or {}
                legs_info.append(
                    {
                        "line": leg.get("line", {}).get("name"),
                        "mode": leg.get("line", {}).get("mode"),
                        "departure": leg.get("departure"),
                        "arrival": leg.get("arrival"),
                        "origin": leg.get("origin", {}).get("name"),
                        "destination": leg.get("destination", {}).get("name"),
                        "origin_lat": origin_loc.get("latitude"),
                        "origin_lng": origin_loc.get("longitude"),
                        "destination_lat": dest_loc.get("latitude"),
                        "destination_lng": dest_loc.get("longitude"),
                        "stopovers": [
                            {
                                "name": stop.get("stop", {}).get("name"),
                                "arrival": stop.get("arrival"),
                                "departure": stop.get("departure"),
                                "platform": stop.get("platform"),
                                "latitude": (stop.get("stop", {}).get("location", {}) or {}).get("latitude"),
                                "longitude": (stop.get("stop", {}).get("location", {}) or {}).get("longitude"),
                            }
                            for stop in leg.get("stopovers", [])
                        ],
                        "polyline": leg.get("polyline"),
                    }
                )

            first_leg = journey["legs"][0]
            last_leg = journey["legs"][-1]
            first_origin_loc = first_leg.get("origin", {}).get("location", {}) or {}
            last_dest_loc = last_leg.get("destination", {}).get("location", {}) or {}

            all_journeys.append(
                {
                    "from": first_leg.get("origin", {}).get("name"),
                    "to": last_leg.get("destination", {}).get("name"),
                    "departure": first_leg.get("departure"),
                    "arrival": last_leg.get("arrival"),
                    "duration": journey.get("duration"),
                    "line": first_leg.get("line", {}).get("name"),
                    "mode": first_leg.get("line", {}).get("mode"),
                    "platform": first_leg.get("platform"),
                    "delay": first_leg.get("delay", 0),
                    "changes": total_changes,
                    "from_lat": first_origin_loc.get("latitude"),
                    "from_lng": first_origin_loc.get("longitude"),
                    "to_lat": last_dest_loc.get("latitude"),
                    "to_lng": last_dest_loc.get("longitude"),
                    "legs": legs_info,
                }
            )

        if all_journeys:
            result = journey_collection.insert_one(all_journeys[0])
            inserted_id = str(result.inserted_id)
            all_journeys[0]["_id"] = inserted_id

            if user_id:
                user_collection.insert_one(
                    {
                        "user_id": user_id,
                        "from": all_journeys[0]["legs"][0]["origin"],
                        "to": all_journeys[0]["legs"][-1]["destination"],
                        "timestamp": datetime.utcnow(),
                        "journey_id": ObjectId(inserted_id),
                    }
                )

            for leg in all_journeys[0]["legs"]:
                for station_name in [leg["origin"], leg["destination"]]:
                    if not station_name:
                        continue
                    station_collection.update_one(
                        {"name": station_name},
                        {"$set": {"name": station_name, "line": leg.get("line")}},
                        upsert=True,
                    )

        cache_departure(cache_key, all_journeys, ttl=300)
        return {"status": "success", "journeys": all_journeys}

    except Exception as e:
        return {"status": "error", "message": str(e)}
