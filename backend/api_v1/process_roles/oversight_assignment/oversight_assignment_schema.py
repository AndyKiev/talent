from pydantic import BaseModel, Field
from typing import List, Literal, Optional


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
    employee_code: Optional[str] = None
    employee_name: Optional[str] = None
    department_id: Optional[int] = None
    department_name: Optional[str] = None
    status: Literal["assigned", "overwritten", "already_assigned", "failed"]
    reason_key: Optional[str] = None
    # names of the conflicting candidates for the multipleCandidates anomaly
    candidates: List[str] = Field(default_factory=list)
    previous_manager_name: Optional[str] = None
    new_manager_name: Optional[str] = None
    # how many levels above the employee's department the manager was found (0 = same)
    levels_up: Optional[int] = None


class OversightAssignmentReport(BaseModel):
    detail: str
    department_id: int
    department_name: Optional[str] = None
    session_id: Optional[int] = None
    session_name: Optional[str] = None
    # True when the session is department-linked and intersects the selected subtree
    session_department_linked: bool = False
    max_levels_up: int
    overwrite: bool
    total: int
    assigned: int
    overwritten: int
    already_assigned: int
    failed: int
    rows: List[OversightAssignmentResultRow]
