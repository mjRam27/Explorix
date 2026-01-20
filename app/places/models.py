# places/models.py
from sqlalchemy import Column, String, Float, Integer, Boolean, Text
from sqlalchemy.dialects.postgresql import BIGINT
from sqlalchemy.sql import func
from sqlalchemy import DateTime
from db.postgres import Base


class Place(Base):
    __tablename__ = "poi"

    id = Column(BIGINT, primary_key=True)

    title = Column(Text, nullable=False)
    normalized_title = Column(Text)

    category = Column(Text)
    poi_type = Column(Text)

    rating = Column(Float)
    reviews_count = Column(Integer)

    street = Column(Text)
    city = Column(Text)
    state = Column(Text)
    country_code = Column(String(2))

    latitude = Column(Float)
    longitude = Column(Float)

    website = Column(Text)
    google_maps_url = Column(Text)

    created_at = Column(DateTime, server_default=func.now())
