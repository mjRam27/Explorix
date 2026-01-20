# itinerary/models.py
from sqlalchemy import Column, String, Date, DateTime, JSON, Boolean, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from db.postgres import Base


class Itinerary(Base):
    __tablename__ = "itineraries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    title = Column(String(300), nullable=False)
    description = Column(String)
    destination = Column(String(200), nullable=False, index=True)

    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    duration_days = Column(Integer, nullable=False)

    # SOURCE OF TRUTH
    days = Column(JSON, nullable=False)

    travel_style = Column(String(50))
    budget = Column(String(50))
    tags = Column(JSON, default=list)

    ai_generated = Column(Boolean, default=False)
    status = Column(String(20), default="draft")
    is_public = Column(Boolean, default=False)

    save_count = Column(Integer, default=0)
    view_count = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class ItineraryPlace(Base):
    __tablename__ = "itinerary_places"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    itinerary_id = Column(
        UUID(as_uuid=True),
        ForeignKey("itineraries.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # ✅ MATCHES poi.id (BIGINT)
    place_id = Column(
        Integer,
        nullable=False,
        index=True
    )

    day_number = Column(Integer, nullable=False)
    order_in_day = Column(Integer, nullable=False)
