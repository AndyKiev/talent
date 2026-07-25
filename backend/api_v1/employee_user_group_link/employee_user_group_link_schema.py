# backend/api_v1/employee_user_group_link/employee_user_group_link_schema.py
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from backend.api_v1.user_group.user_group_schema import UserGroup as UserGroupSchema


class EmployeeUserGroupLinkBase(BaseModel):
    employee_id: int
    user_group_id: int


class EmployeeUserGroupLinkCreate(EmployeeUserGroupLinkBase):
    pass


class EmployeeUserGroupLink(EmployeeUserGroupLinkBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    user_group: UserGroupSchema | None = None


class GroupOfType(BaseModel):
    """A single group attached to an employee, with its type for column grouping."""

    model_config = ConfigDict(from_attributes=True)
    link_id: int
    group_id: int
    group_name: str
    user_group_type_id: int
    user_group_type_name: str | None = None


class EmployeeWithGroups(BaseModel):
    """
    Employee row tailored for the Users management grid.
    Carries email presence + groups already attached, for link/unlink UI.
    """

    model_config = ConfigDict(from_attributes=True)
    id: int
    code: str
    name: str
    email: str | None = None
    job_name: str | None = None
    groups: list[GroupOfType] = []
