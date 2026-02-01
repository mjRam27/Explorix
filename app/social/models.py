# app/social/models.py
from sqlalchemy import Column, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime

from db.postgres import Base


class UserFollow(Base):
    __tablename__ = "user_follows"

    follower_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True
    )

    following_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True
    )

    created_at = Column(DateTime, default=datetime.utcnow)
