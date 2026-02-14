from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class WasteReport(BaseModel):
    image_url: str
    latitude: float
    longitude: float
    confidence_score: float
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    status: str = "detected" # detected, cleaned, pending

class WasteReportResponse(WasteReport):
    id: str = Field(alias="_id")

    class Config:
        populate_by_name = True
