from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ProcessRoleHolderDepartmentLinkBase(BaseModel):
    process_role_holder_id: int
    department_id: int


class ProcessRoleHolderDepartmentLinkCreate(ProcessRoleHolderDepartmentLinkBase):
    # process_role_id is derived server-side from the holder, never from the client
    pass


class ProcessRoleHolderDepartmentLink(ProcessRoleHolderDepartmentLinkBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    process_role_id: int
    created_at: datetime
    department_name: str | None = None
