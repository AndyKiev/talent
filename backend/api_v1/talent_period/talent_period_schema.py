from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime


class TalentPeriodBase(BaseModel):
    name: str = Field(..., max_length=32)
    description: Optional[str] = Field(None, max_length=64)
    is_active: bool = True


class TalentPeriodCreate(TalentPeriodBase):
    pass


class TalentPeriodUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=32)
    description: Optional[str] = Field(None, max_length=64)
    is_active: Optional[bool] = None


class TalentPeriod(TalentPeriodBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
