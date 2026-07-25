from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PlanSessionStatusBase(BaseModel):
    key: str = Field(..., max_length=16)
    name: str = Field(..., max_length=64)
    description: str | None = Field(None, max_length=256)


class PlanSessionStatusCreate(PlanSessionStatusBase):
    pass


class PlanSessionStatusUpdate(BaseModel):
    key: str | None = Field(None, max_length=16)
    name: str | None = Field(None, max_length=64)
    description: str | None = Field(None, max_length=256)


class PlanSessionStatus(PlanSessionStatusBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    is_active: bool
    created_at: datetime
