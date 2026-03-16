from pydantic import BaseModel
from typing import Dict, Any


class ItineraryDraftRequest(BaseModel):
    draft: Dict[str, Any]
