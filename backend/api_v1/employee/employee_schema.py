# backend/api_v1/employee/employee_schema.py
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime


class EmployeeBase(BaseModel):
    code: str = Field(..., max_length=10)
    name: str = Field(..., max_length=100)
    email: Optional[str] = Field(None, max_length=100)
    is_active: bool = True
    job_id: int = Field(default=1)
    lang_id: int = Field(default=3)


class EmployeeCreate(EmployeeBase):
    pass


class EmployeeUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    email: Optional[str] = Field(None, max_length=100)
    is_active: Optional[bool] = None
    job_id: Optional[int] = None
    lang_id: Optional[int] = None


class EmployeeSchema(EmployeeBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    groups: List[str] = []           # populated via Employee.groups @property
    operations: List[str] = []       # populated by EmployeeService (async repo query)
    job: Optional["Job"] = None
    lang: Optional["Lang"] = None
    # Populated by EmployeeService._to_schema from the selectin-loaded relationship.
    main_departments: List["MainDepartmentSchema"] = []   # is_main=True links
    extra_departments: List["MainDepartmentSchema"] = []  # is_main=False links


# ── Slim read schema used inside EmployeeSchema ───────────────────────────────
# We intentionally keep this minimal — just what the grid column needs.

class MainDepartmentSchema(BaseModel):
    """Slim department info embedded in EmployeeSchema departments lists."""
    model_config = ConfigDict(from_attributes=True)
    id: int           # EmployeeDepartment.id  (link id, useful for delete)
    department_id: int
    name: str         # department name — populated manually in _to_schema


# ── Late imports to avoid circular references ─────────────────────────────────
from backend.api_v1.job.job_schema import Job        # noqa: E402
from backend.api_v1.lang.lang_schema import Lang     # noqa: E402

EmployeeSchema.model_rebuild()