from typing import Literal

from pydantic import BaseModel, Field


class OversightAssignmentRunRequest(BaseModel):
    department_id: int
    # skip employees who already have an oversight manager (default) or
    # replace their link with the job-derived candidate.
    overwrite: bool = False


# Per-employee outcome of one run. status:
#   assigned          — link created (employee had none)
#   overwritten       — existing link replaced (overwrite=True)
#   already_assigned  — untouched: had a manager (or the computed one matches)
#   failed            — no link written; reason_key says why:
#       notParametrized   — no oversight-linked job on any searched level's type
#       noHolderFound     — job(s) configured but nobody holds them in reach
#       onlySelfCandidate — the only holder found was the employee themself
#       multipleCandidates— anomaly: 2+ possible managers, none assigned
class OversightAssignmentResultRow(BaseModel):
    employee_id: int
    employee_code: str | None = None
    employee_name: str | None = None
    department_id: int | None = None
    department_name: str | None = None
    status: Literal["assigned", "overwritten", "already_assigned", "failed"]
    reason_key: str | None = None
    # names of the conflicting candidates for the multipleCandidates anomaly
    candidates: list[str] = Field(default_factory=list)
    previous_manager_name: str | None = None
    new_manager_name: str | None = None
    # how many levels above the employee's department the manager was found (0 = same)
    levels_up: int | None = None


class OversightAssignmentReport(BaseModel):
    detail: str
    department_id: int
    department_name: str | None = None
    session_id: int | None = None
    session_name: str | None = None
    # True when the session is department-linked and intersects the selected subtree
    session_department_linked: bool = False
    max_levels_up: int
    overwrite: bool
    total: int
    assigned: int
    overwritten: int
    already_assigned: int
    failed: int
    rows: list[OversightAssignmentResultRow]
