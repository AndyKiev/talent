from pydantic import BaseModel, ConfigDict, Field
from typing import Optional


class TalentAuditStatusBase(BaseModel):
    name: str = Field(..., max_length=32)
    description: Optional[str] = Field(None, max_length=128)


class TalentAuditStatusCreate(TalentAuditStatusBase):
    pass


class TalentAuditStatusUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=32)
    description: Optional[str] = Field(None, max_length=128)


class TalentAuditStatus(TalentAuditStatusBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
