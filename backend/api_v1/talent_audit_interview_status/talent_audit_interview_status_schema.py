from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class TalentAuditInterviewStatusBase(BaseModel):
    name: str = Field(..., max_length=32)
    description: Optional[str] = Field(None, max_length=128)


class TalentAuditInterviewStatusCreate(TalentAuditInterviewStatusBase):
    pass


class TalentAuditInterviewStatusUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=32)
    description: Optional[str] = Field(None, max_length=128)


class TalentAuditInterviewStatus(TalentAuditInterviewStatusBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
