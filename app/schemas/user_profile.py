# schemas/user.py
from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional


class UserProfile(BaseModel):
    user_id: str
    email: EmailStr
    created_at: datetime

class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    country_code: Optional[str] = None