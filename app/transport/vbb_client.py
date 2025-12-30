import requests
from datetime import datetime
from utils.db_mongo import log_trip
from bson import ObjectId

# from utils.db_neo4j import create_route  # Neo4j disabled

# Redis fallback: dummy no-op functions
def cache_departure(*args, **kwargs):
    pass

def get_cached_departure(*args, **kwargs):
    return None

# Transport mode filters
MODE_FILTERS = {
    "bus": ["Bus"],
    "tram": ["Tram"],
    "ice": ["ICE", "FEX", "FLX"],
    "sbahn": ["S"],
    "ubahn": ["U"],
    "re": ["RE", "RB"]
}

def fetch_mode_data(station_from, station_to, mode_key):
    redis_key = f"{mode_key}:{station_from}->{station_to}"
    cached = get_cached_departure(redis_key)
    if cached:
        print(f"🔁 Using cached {mode_key.upper()} data")
        return cached

    url = f"https://v5.vbb.transport.rest/stops/{station_from}/departures"
    params = {
        "duration": 120,
        "language": "en",
        "remarks": "true"
    }

    print(f"📡 Calling URL: {url}")
    print("🔥 Fetching mode data triggered!")

    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        journeys = []
        for trip in data:
            line_info = trip.get("line", {})
            product = line_info.get("productName", "Unknown")

            if product not in MODE_FILTERS.get(mode_key, []):
                continue

            journey_data = {
                "from": trip.get("stop", {}).get("name", "Unknown"),
                "to": trip.get("destination", {}).get("name", "Unknown"),
                "departure": datetime.fromisoformat(trip["when"]).strftime("%H:%M") if trip.get("when") else "N/A",
                "arrival": "N/A",
                "duration": "N/A",
                "line": line_info.get("name", "N/A"),
                "platform": trip.get("platform", "N/A"),
                "delay": trip.get("delay", 0),
                "stops": [],
                "mode": product
            }

            # Log to MongoDB (do not return ObjectId)
            log_trip(journey_data, f"{mode_key}_logs")

            # Neo4j disabled
            # create_route(journey_data["from"], journey_data["to"], journey_data["line"], journey_data["delay"])

            journeys.append(journey_data)

        # Cache result (safe no-op)
              # Cache result (no-op if Redis is disabled)
        cache_departure(redis_key, journeys)

        # Clean out ObjectId (_id) that MongoDB adds
        clean_journeys = [{k: v for k, v in j.items() if k != "_id"} for j in journeys]

        return clean_journeys

    except Exception as e:
        print(f"❌ Error in fetch_mode_data: {e}")
        return {"error": str(e)}
