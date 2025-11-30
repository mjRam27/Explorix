import requests

def refresh_journey(refresh_token: str):
    url = "https://v6.vbb.transport.rest/journeys"
    params = {
        "refreshToken": refresh_token,
        "stopovers": True,
        "language": "en"
    }
    response = requests.get(url, params=params)
    response.raise_for_status()
    return response.json()
