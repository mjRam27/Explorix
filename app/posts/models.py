# app/posts/models.py
import uuid

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


# =========================
# POSTS
# =========================
class Post(Base):
    __tablename__ = "posts"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # 🔹 Media
    media_url = Column(Text, nullable=True)

    media_type = Column(
        Enum("image", "video", name="media_type"),
        nullable=True,
    )

    # 🔹 Category
    category = Column(
        Enum(
            "food",
            "nature",
            "culture",
            "shopping",
            "hidden_gems",
            name="post_category",
        ),
        nullable=True,
        index=True,
    )

    # 🔹 Caption
    caption = Column(Text, nullable=True)

    # 🔹 Location
    location_name = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        index=True,
    )

    # 🔹 Relationships
    user = relationship("User", back_populates="posts")


# =========================
# POST LIKES
# =========================
class PostLike(Base):
    __tablename__ = "post_likes"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    post_id = Column(
        UUID(as_uuid=True),
        ForeignKey("posts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )


# =========================
# POST SAVES (FAVORITES)
# =========================
class PostSave(Base):
    __tablename__ = "post_saves"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    post_id = Column(
        UUID(as_uuid=True),
        ForeignKey("posts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )


# =========================
# POST COMMENTS
# =========================
class PostComment(Base):
    __tablename__ = "post_comments"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    post_id = Column(
        UUID(as_uuid=True),
        ForeignKey("posts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    content = Column(Text, nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        index=True,
    )
