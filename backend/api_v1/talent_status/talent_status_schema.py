from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class TalentStatusBase(BaseModel):
    key: str = Field(..., max_length=8)
    name: str = Field(..., max_length=32)
    description: str | None = Field(None, max_length=64)
    is_active: bool = True


class TalentStatusCreate(TalentStatusBase):
    pass


class TalentStatusUpdate(BaseModel):
    key: str | None = Field(None, max_length=8)
    name: str | None = Field(None, max_length=32)
    description: str | None = Field(None, max_length=64)
    is_active: bool | None = None


class TalentStatus(TalentStatusBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
