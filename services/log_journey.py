from fastapi import APIRouter, Request
from services.history_logic import log_user_journey

router = APIRouter()

@router.post("/log-journey")
async def log(request: Request):
    data = await request.json()
    log_user_journey(data["user_id"], data["from_station"], data["to_station"], data["journey_id"])
    return {"message": "Journey logged"}
