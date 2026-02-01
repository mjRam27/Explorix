# auth/models.py
from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid

from db.postgres import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)

    name = Column(String(100), nullable=True)
    country_code = Column(String(10), nullable=True)

    is_active = Column(String, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # 🔹 Relationship to posts
    posts = relationship(
        "Post",
        back_populates="user",
        cascade="all, delete",
    )
