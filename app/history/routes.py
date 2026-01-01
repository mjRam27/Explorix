from fastapi import APIRouter, Request, Query
from bson import ObjectId

from history.service import (
    log_user_journey,
    get_user_history
)

router = APIRouter(prefix="/history", tags=["User History"])


@router.post("/log-journey")
async def log_journey(request: Request):
    data = await request.json()

    log_user_journey(
        user_id=data["user_id"],
        from_station=data["from_station"],
        to_station=data["to_station"],
        journey_id=data["journey_id"]
    )

    return {"message": "Journey logged"}


@router.get("/user-history")
def user_history(user_id: str = Query(...)):
    logs = get_user_history(user_id)

    # Convert ObjectId → str (API-safe)
    for log in logs:
        if "_id" in log and isinstance(log["_id"], ObjectId):
            log["_id"] = str(log["_id"])

    return {"logs": logs}
