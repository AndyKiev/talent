from datetime import datetime

from pydantic import BaseModel, ConfigDict


class TalentAuditBase(BaseModel):
    employee_id: int
    status_id: int


class TalentAuditCreate(TalentAuditBase):
    # created_by injected from the authenticated user in the service
    # talent_plus is not set at creation; defaults to False in the DB.
    pass


class TalentAuditUpdate(BaseModel):
    # All optional — PATCH may carry only status_id, only talent_plus, or both.
    status_id: int | None = None
    talent_plus: bool | None = None


class TalentAudit(TalentAuditBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    talent_plus: bool
    created_by: int
    created_at: datetime
