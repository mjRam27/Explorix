import os
from urllib.parse import quote_plus

import requests


def get_station_id(station_name: str) -> str:
    try:
        api_base = os.getenv("TRANSPORT_API_BASE", "https://v6.db.transport.rest").rstrip("/")
        encoded_name = quote_plus(station_name)
        url = f"{api_base}/locations?query={encoded_name}"

        response = requests.get(url, timeout=10, headers={"User-Agent": "Explorix-App"})
        if response.status_code != 200:
            raise RuntimeError(f"API returned {response.status_code}: {response.text}")

        data = response.json()
        if not data or "id" not in data[0]:
            raise RuntimeError("No valid station found.")

        return str(data[0]["id"])

    except Exception as e:
        print(f"Live transport lookup failed for '{station_name}': {e}")
        fallback_ids = {
            "berlin": "900000100003",
            "heidelberg": "8000156",
            "mannheim": "8000244",
            "frankfurt": "8000105",
        }
        return fallback_ids.get(station_name.lower(), station_name)
