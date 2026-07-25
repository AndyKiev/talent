from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class TalentPeriodBase(BaseModel):
    name: str = Field(..., max_length=32)
    description: str | None = Field(None, max_length=64)
    is_active: bool = True
    qty_months: int = Field(..., ge=0, description="Duration of the period in months")


class TalentPeriodCreate(TalentPeriodBase):
    pass


class TalentPeriodUpdate(BaseModel):
    name: str | None = Field(None, max_length=32)
    description: str | None = Field(None, max_length=64)
    is_active: bool | None = None
    qty_months: int | None = Field(None, ge=0)


class TalentPeriod(TalentPeriodBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
