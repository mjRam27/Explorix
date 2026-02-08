# transport/refresh_service.py
import os
import requests

def refresh_journey(refresh_token: str):
    api_base = os.getenv("TRANSPORT_API_BASE", "https://v6.db.transport.rest").rstrip("/")
    url = f"{api_base}/journeys"
    params = {
        "refreshToken": refresh_token,
        "stopovers": True,
        "language": "en"
    }
    response = requests.get(url, params=params)
    response.raise_for_status()
    return response.json()
