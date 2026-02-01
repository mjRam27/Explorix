# app/posts/models.py
import uuid
from datetime import datetime

from sqlalchemy import (
    Column,
    String,
    DateTime,
    ForeignKey,
    Text,
    Float,
    Enum,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from db.postgres import Base


class Post(Base):
    __tablename__ = "posts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # 🔹 Media
    media_url = Column(Text, nullable=False)
    media_type = Column(
        Enum("image", "video", name="media_type"),
        nullable=False,
    )
    has_audio = Column(String, nullable=True)

    # 🔹 Content
    caption = Column(Text, nullable=True)
    category = Column(
        Enum(
            "food",
            "nature",
            "culture",
            "shopping",
            "hidden_gems",
            name="post_category",
        ),
        nullable=False,
        index=True,
    )

    # 🔹 Location
    location_name = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        index=True,
    )

    # 🔹 Relationship
    user = relationship("User", back_populates="posts")
