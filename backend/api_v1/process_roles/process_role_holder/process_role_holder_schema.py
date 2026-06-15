from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


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
    holder_code: Optional[str] = None
    holder_name: Optional[str] = None
    assigner_name: Optional[str] = None
    role_name: Optional[str] = None
