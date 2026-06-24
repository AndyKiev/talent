# backend/api_v1/employee/employee_schema.py
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List, FrozenSet, Tuple, Literal
from datetime import datetime, date


class EmployeeBase(BaseModel):
    code: str = Field(..., max_length=10)
    name: str = Field(..., max_length=100)
    email: Optional[str] = Field(None, max_length=100)
    is_active: bool = True
    job_id: int = Field(default=1)
    lang_id: int = Field(default=3)


class EmployeeCreate(EmployeeBase):
    pass


class EmployeePersonalDataUpdate(BaseModel):
    """Editable personal data (DD.MM.YYYY in the UI). Partial — only the fields
    actually sent are applied (model_dump(exclude_unset=True) in the service)."""

    birth_date: Optional[date] = None
    hire_date: Optional[date] = None
    job_assigned_date: Optional[date] = None
    sex: Optional[Literal["male", "female"]] = None
    marital_status: Optional[Literal["married", "not_married"]] = None


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
    # Read-only — mirrors Employee.current_level_id @property (1:1 link table).
    current_level_id: Optional[int] = None
    # Read-only — mirror Employee.birth_date / hire_date @propertys (personal-data table).
    birth_date: Optional[date] = None
    hire_date: Optional[date] = None
    job_assigned_date: Optional[date] = None
    sex: Optional[str] = None
    marital_status: Optional[str] = None
    groups: List[str] = []  # populated via Employee.groups @property
    operations: List[str] = []  # DEPRECATED — kept during transition window

    # Resolved access-control grants, populated by EmployeeService._to_schema.
    # Excluded from serialization — used only by the has_access dependencies.
    permissions: FrozenSet[Tuple[str, str]] = Field(
        default_factory=frozenset, exclude=True
    )
    permission_sets: FrozenSet[Tuple[str, FrozenSet[str]]] = Field(
        default_factory=frozenset, exclude=True
    )
    # Superadmin / bypass-group flag, set in jwt_auth.get_current_auth_user.
    # Excluded from serialization — used only by the has_access dependencies.
    is_bypass: bool = Field(default=False, exclude=True)
    job: Optional["Job"] = None
    lang: Optional["Lang"] = None
    # Populated by EmployeeService._to_schema from the selectin-loaded relationship.
    main_departments: List["MainDepartmentSchema"] = []  # is_main=True links
    extra_departments: List["MainDepartmentSchema"] = []  # is_main=False links


# ── Slim read schema used inside EmployeeSchema ───────────────────────────────
# We intentionally keep this minimal — just what the grid column needs.


class MainDepartmentSchema(BaseModel):
    """Slim department info embedded in EmployeeSchema departments lists."""

    model_config = ConfigDict(from_attributes=True)
    id: int  # EmployeeDepartment.id  (link id, useful for delete)
    department_id: int
    name: str  # department name — populated manually in _to_schema


# ── Late imports to avoid circular references ─────────────────────────────────
from backend.api_v1.job.job_schema import Job  # noqa: E402
from backend.api_v1.lang.lang_schema import Lang  # noqa: E402

EmployeeSchema.model_rebuild()
