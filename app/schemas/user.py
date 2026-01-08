from pydantic import BaseModel, EmailStr
from datetime import datetime


class UserProfile(BaseModel):
    user_id: str
    email: EmailStr
    created_at: datetime
