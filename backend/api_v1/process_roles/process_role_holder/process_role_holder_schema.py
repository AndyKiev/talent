from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ProcessRoleHolderBase(BaseModel):
    process_role_id: int
    holder_employee_id: int


class ProcessRoleHolderCreate(ProcessRoleHolderBase):
    # assigned_by is set server-side from the current user, never from the client
    pass


class ProcessRoleHolder(ProcessRoleHolderBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    assigned_by: int
    created_at: datetime
    holder_code: str | None = None
    holder_name: str | None = None
    assigner_name: str | None = None
    role_name: str | None = None
