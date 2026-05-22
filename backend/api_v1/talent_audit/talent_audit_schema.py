from datetime import datetime

from pydantic import BaseModel, ConfigDict


class TalentAuditBase(BaseModel):
    employee_id: int
    status_id: int


class TalentAuditCreate(TalentAuditBase):
    # created_by injected from the authenticated user in the service
    pass


class TalentAuditUpdate(BaseModel):
    status_id: int


class TalentAudit(TalentAuditBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_by: int
    created_at: datetime
