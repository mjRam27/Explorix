import requests
from urllib.parse import quote_plus

def get_station_id(station_name: str) -> str:
    try:
        # Ensure the station name is URL-safe
        encoded_name = quote_plus(station_name)
        url = f"https://v6.vbb.transport.rest/locations?query={encoded_name}"

        # Shorter timeout for reliability
        response = requests.get(url, timeout=10)

        # Check for success
        if response.status_code != 200:
            raise RuntimeError(f"API returned {response.status_code}: {response.text}")

        data = response.json()

        # Validate data
        if not data or "id" not in data[0]:
            raise RuntimeError("No valid station found.")

        return data[0]["id"]

    except Exception as e:
        print(f"⚠️ Live VBB lookup failed for '{station_name}': {e}")
        # --- Fallback demo station IDs ---
        fallback_ids = {
            "berlin": "900037168",
            "potsdam": "900230999",
            "spandau": "900090001",
            "charlottenburg": "900020201",
            "alexanderplatz": "900100003",
        }
        return fallback_ids.get(station_name.lower(), "000000000")
