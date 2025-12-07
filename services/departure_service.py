import requests
from utils.db_redis import get_cached_departure, cache_departure, redis_client

# Station IDs you want to cache
CACHED_STATIONS = {"900000003201", "900000260009"}

def fetch_departures(station_id: str, duration: int = 30):
    key = f"departures:{station_id}"

    if station_id in CACHED_STATIONS:
        ttl = redis_client.ttl(key)

        if ttl > 0:
            cached = get_cached_departure(key)
            if cached:
                if ttl < 10:
                    print(f"⏳ TTL < 10s for {station_id}, refreshing cache...")
                    try:
                        fresh = _fetch_and_format_departures(station_id, duration)
                        cache_departure(key, fresh, ttl=60)
                        return fresh
                    except Exception as e:
                        print("⚠️ Refresh failed, falling back to cached data:", e)
                        return cached
                else:
                    print(f"✅ Redis hit for {station_id}, TTL = {ttl}s")
                    return cached

    # No cache or not eligible: fetch fresh
    fresh_departures = _fetch_and_format_departures(station_id, duration)

    if station_id in CACHED_STATIONS:
        cache_departure(key, fresh_departures, ttl=60)

    return fresh_departures


def _fetch_and_format_departures(station_id: str, duration: int):
    # FIXED v6 endpoint
    url = "https://v6.vbb.transport.rest/departures"

    params = {
        "stop": station_id,
        "duration": duration,
        "language": "en"
    }

    response = requests.get(url, params=params, headers={"User-Agent": "Explorix-App"})
    response.raise_for_status()

    raw_departures = response.json()

    # Validate correct response format
    if not isinstance(raw_departures, list):
        raise ValueError(f"Unexpected departures format from VBB: {raw_departures}")

    departures = []
    for dep in raw_departures:
        if isinstance(dep, dict) and dep.get("when"):
            departures.append({
                "tripId": dep.get("tripId"),
                "line": dep.get("line", {}).get("name", "N/A"),
                "direction": dep.get("direction", "Unknown"),
                "when": dep.get("when"),
                "plannedWhen": dep.get("plannedWhen"),
                "delay": dep.get("delay", 0),
                "platform": dep.get("platform", "N/A"),
                "mode": dep.get("line", {}).get("mode", "N/A")
            })

    return departures
