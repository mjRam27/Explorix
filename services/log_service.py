from fastapi import APIRouter, Query
from services.log_service import get_user_history
from bson import ObjectId

router = APIRouter()

@router.get("/user-history")
def user_history(user_id: str):
    logs = get_user_history(user_id)

    # ✅ Convert ObjectId to str for _id and journey_id
    for log in logs:
        if "_id" in log and isinstance(log["_id"], ObjectId):
            log["_id"] = str(log["_id"])
        if "journey_id" in log and isinstance(log["journey_id"], ObjectId):
            log["journey_id"] = str(log["journey_id"])

    return {"logs": logs}
