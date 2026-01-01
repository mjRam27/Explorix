from datetime import datetime
from uuid import uuid4
from app.db.db_mongo import conversations

MAX_HISTORY = 6  # last N messages sent to model


def create_conversation(user_id: str) -> str:
    conversation_id = str(uuid4())
    conversations.insert_one({
        "conversation_id": conversation_id,
        "user_id": user_id,
        "messages": [],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    })
    return conversation_id


def append_message(conversation_id: str, role: str, content: str):
    conversations.update_one(
        {"conversation_id": conversation_id},
        {
            "$push": {
                "messages": {
                    "role": role,
                    "content": content,
                    "ts": datetime.utcnow()
                }
            },
            "$set": {"updated_at": datetime.utcnow()}
        }
    )


def get_conversation_history(conversation_id: str):
    convo = conversations.find_one(
        {"conversation_id": conversation_id},
        {"_id": 0, "messages": {"$slice": -MAX_HISTORY}}
    )
    return convo["messages"] if convo else []
