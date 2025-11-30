from fastapi import APIRouter, Query
from bson import ObjectId
from services.history_logic import get_user_history

router = APIRouter()

@router.get("/user-history")
def user_history(user_id: str = Query(...)):
    logs = get_user_history(user_id)

    for log in logs:
        if "_id" in log:
            log["_id"] = str(log["_id"])
        if "journey_id" in log:
            log["journey_id"] = str(log["journey_id"])

    return {"logs": logs}
