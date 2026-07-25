from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ProcessRoleHolderEmployeeLinkBase(BaseModel):
    process_role_holder_id: int
    employee_id: int


class ProcessRoleHolderEmployeeLinkCreate(ProcessRoleHolderEmployeeLinkBase):
    # process_role_id is derived server-side from the holder, never from the client
    pass


class ProcessRoleHolderEmployeeLink(ProcessRoleHolderEmployeeLinkBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    process_role_id: int
    created_at: datetime
    employee_code: str | None = None
    employee_name: str | None = None
    order_position: int | None = None


class ProcessRoleHolderEmployeeReorder(BaseModel):
    """Bulk roster reorder for one holder: the link ids in their new top-to-bottom
    order. Positions are reassigned server-side as 10, 20, 30 …"""

    process_role_holder_id: int
    ordered_ids: list[int]
