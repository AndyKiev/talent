from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime


class ReviewSessionStatusBase(BaseModel):
    key: str = Field(..., max_length=16)
    name: str = Field(..., max_length=64)
    description: Optional[str] = Field(None, max_length=256)


class ReviewSessionStatusCreate(ReviewSessionStatusBase):
    pass


class ReviewSessionStatusUpdate(BaseModel):
    key: Optional[str] = Field(None, max_length=16)
    name: Optional[str] = Field(None, max_length=64)
    description: Optional[str] = Field(None, max_length=256)


class ReviewSessionStatus(ReviewSessionStatusBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    is_active: bool
    created_at: datetime
