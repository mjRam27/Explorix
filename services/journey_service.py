import requests
from pymongo import MongoClient
from dotenv import load_dotenv
from datetime import datetime
import os
from utils.db_redis import cache_departure, get_cached_departure
from utils.resolve import get_station_id
from bson import ObjectId

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGO_URI)
db = client["Vbb_transport"]
journey_collection = db["journey_logs"]
station_collection = db["station_logs"]
user_collection = db["user_logs"]

def fetch_journey(from_station: str, to_station: str, products: list[str] = None, date: str = None, user_id: str = None, departure: str = None):
    from_id = get_station_id(from_station) if not from_station.isdigit() else from_station
    to_id = get_station_id(to_station) if not to_station.isdigit() else to_station

    cache_key = f"{from_id}:{to_id}:{','.join(products or [])}:{date or ''}"
    cached = get_cached_departure(cache_key)
    if cached:
        print("✅ Cache hit:", cache_key)
        return {"status": "cached", "journeys": cached}

    url = "https://v6.vbb.transport.rest/journeys"
    params = {
        "from": from_id,
        "to": to_id,
        "stopovers": True,
        "results": 5,
        "language": "en",
        "duration": 90,
        "departure": departure,
    }

    if products:
        modes_map = {
            "train": ["suburban", "subway", "regional", "express"],
            "bus": ["bus"],
            "tram": ["tram"],
            "all": ["suburban", "subway", "regional", "express", "bus", "tram"]
        }

        for p in products:
            for mode in modes_map.get(p, []):
                params.setdefault("products[]", []).append(mode)

    if date:
        params["departure"] = date

    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()

        if not data.get("journeys"):
            return {"status": "error", "message": "No journey found"}

        all_journeys = []

        for journey in data["journeys"]:
            legs_info = []
            total_changes = len(journey["legs"]) - 1

            for leg in journey["legs"]:
                legs_info.append({
                    "line": leg.get("line", {}).get("name"),
                    "mode": leg.get("line", {}).get("mode"),
                    "departure": leg.get("departure"),
                    "arrival": leg.get("arrival"),
                    "origin": leg.get("origin", {}).get("name"),
                    "destination": leg.get("destination", {}).get("name"),
                    "stopovers": [
                        {
                            "name": stop.get("stop", {}).get("name"),
                            "arrival": stop.get("arrival"),
                            "departure": stop.get("departure"),
                            "platform": stop.get("platform"),
                        }
                        for stop in leg.get("stopovers", [])
                    ]
                })

            # ✅ Extract key info from first and last legs
            first_leg = journey["legs"][0]
            last_leg = journey["legs"][-1]

            all_journeys.append({
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
                "legs": legs_info
            })

        if all_journeys:
            result = journey_collection.insert_one(all_journeys[0])
            inserted_id = str(result.inserted_id)
            all_journeys[0]["_id"] = inserted_id

            if user_id:
                user_collection.insert_one({
                    "user_id": user_id,
                    "from": all_journeys[0]["legs"][0]["origin"],
                    "to": all_journeys[0]["legs"][-1]["destination"],
                    "timestamp": datetime.utcnow(),
                    "journey_id": ObjectId(inserted_id)
                })

            for leg in all_journeys[0]["legs"]:
                for station_name in [leg["origin"], leg["destination"]]:
                    station_collection.update_one(
                        {"station_id": station_name},
                        {"$set": {"name": station_name, "line": leg["line"]}},
                        upsert=True
                    )

        cache_departure(cache_key, all_journeys, ttl=300)
        return {"status": "success", "journeys": all_journeys}

    except Exception as e:
        return {"status": "error", "message": str(e)}
