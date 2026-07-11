from pydantic import BaseModel, ConfigDict
from typing import Optional, List


class ActiveContextUpdate(BaseModel):
    """PUT body — set the current user's active mode (role) + department.
    process_role_id = null means 'no mode on' (sees only self)."""

    process_role_id: Optional[int] = None
    department_id: Optional[int] = None


class ActiveContextRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    process_role_id: Optional[int] = None
    department_id: Optional[int] = None


class MyRole(BaseModel):
    process_role_id: int
    key: Optional[str] = None
    name: str
    link_target: str


class MyDepartment(BaseModel):
    id: int
    name: str
    process_role_id: int


class SessionScopeAvailability(BaseModel):
    """Per-review-session availability of the scope modes: whether the current
    user is themselves an employee of the session ('only myself' selectable) and
    which of their employee-target (oversight) roles have at least one linked
    employee in the session."""

    self_in_session: bool
    oversight_role_ids_with_members: List[int] = []


class MyScopes(BaseModel):
    """Everything the people-review scope controls need: the roles the current
    user holds, the departments they supervise (per dept-target role), and the
    persisted active context."""

    roles: List[MyRole] = []
    departments: List[MyDepartment] = []
    active: ActiveContextRead = ActiveContextRead()
