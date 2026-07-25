
from pydantic import BaseModel, ConfigDict


class ActiveContextUpdate(BaseModel):
    """PUT body — set the current user's active mode (role) + department.
    process_role_id = null means 'no mode on' (sees only self)."""

    process_role_id: int | None = None
    department_id: int | None = None


class ActiveContextRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    process_role_id: int | None = None
    department_id: int | None = None


class MyRole(BaseModel):
    process_role_id: int
    key: str | None = None
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
    oversight_role_ids_with_members: list[int] = []


class MyScopes(BaseModel):
    """Everything the people-review scope controls need: the roles the current
    user holds, the departments they supervise (per dept-target role), and the
    persisted active context."""

    roles: list[MyRole] = []
    departments: list[MyDepartment] = []
    active: ActiveContextRead = ActiveContextRead()
