import requests

def search_location(query: str):
    """Resolve city/place name into coordinates using OpenStreetMap."""
    url = f"https://nominatim.openstreetmap.org/search?q={query}&format=json&limit=1"

    response = requests.get(url, headers={"User-Agent": "Explorix-App"})
    data = response.json()

    if not data:
        return None

    return {
        "name": data[0]["display_name"],
        "lat": float(data[0]["lat"]),
        "lon": float(data[0]["lon"])
    }
