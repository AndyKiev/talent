from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime


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
    employee_code: Optional[str] = None
    employee_name: Optional[str] = None
    order_position: Optional[int] = None


class ProcessRoleHolderEmployeeReorder(BaseModel):
    """Bulk roster reorder for one holder: the link ids in their new top-to-bottom
    order. Positions are reassigned server-side as 10, 20, 30 …"""

    process_role_holder_id: int
    ordered_ids: List[int]
