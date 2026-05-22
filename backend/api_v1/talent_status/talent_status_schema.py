from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime


class TalentStatusBase(BaseModel):
    key: str = Field(..., max_length=8)
    name: str = Field(..., max_length=32)
    description: Optional[str] = Field(None, max_length=64)
    is_active: bool = True


class TalentStatusCreate(TalentStatusBase):
    pass


class TalentStatusUpdate(BaseModel):
    key: Optional[str] = Field(None, max_length=8)
    name: Optional[str] = Field(None, max_length=32)
    description: Optional[str] = Field(None, max_length=64)
    is_active: Optional[bool] = None


class TalentStatus(TalentStatusBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
