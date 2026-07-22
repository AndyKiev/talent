from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ReviewSessionEmployeeDimensionType(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    key: str = Field(..., max_length=32)
    description: str = ""
    sort_order: int = 0
    created_at: datetime
