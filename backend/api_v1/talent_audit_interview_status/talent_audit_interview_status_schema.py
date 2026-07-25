
from pydantic import BaseModel, ConfigDict, Field


class TalentAuditInterviewStatusBase(BaseModel):
    name: str = Field(..., max_length=32)
    description: str | None = Field(None, max_length=128)


class TalentAuditInterviewStatusCreate(TalentAuditInterviewStatusBase):
    pass


class TalentAuditInterviewStatusUpdate(BaseModel):
    name: str | None = Field(None, max_length=32)
    description: str | None = Field(None, max_length=128)


class TalentAuditInterviewStatus(TalentAuditInterviewStatusBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
