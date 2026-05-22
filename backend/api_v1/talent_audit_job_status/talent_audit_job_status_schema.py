from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class TalentAuditJobStatusBase(BaseModel):
    name: str = Field(..., max_length=32)
    description: Optional[str] = Field(None, max_length=128)


class TalentAuditJobStatusCreate(TalentAuditJobStatusBase):
    pass


class TalentAuditJobStatusUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=32)
    description: Optional[str] = Field(None, max_length=128)


class TalentAuditJobStatus(TalentAuditJobStatusBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
