# backend/api_v1/employee/employee_schema.py
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List, FrozenSet, Tuple, Literal
from datetime import datetime, date

from backend.api_v1.department.department_org_units import TopOrgUnit


class EmployeeBase(BaseModel):
    code: str = Field(..., max_length=10)
    name: str = Field(..., max_length=100)
    email: Optional[str] = Field(None, max_length=100)
    is_active: bool = True
    job_id: Optional[int] = Field(default=None)
    lang_id: int = Field(default=3)


class EmployeeCreate(EmployeeBase):
    # Physical person behind this employee (set by orchestration code that
    # created the person first; plain POST /employees may pass one directly).
    person_id: Optional[int] = None


class EmployeeWithActivationCreate(EmployeeBase):
    """
    One-shot employee creation with an activation event.
    Reuses EmployeeBase for employee fields; adds activation fields.
    A person is created under the hood from the split name fields;
    `name` is derived server-side ('LAST FIRST') and thus optional here.
    """

    name: Optional[str] = Field(None, max_length=100)
    first_name: str = Field(..., max_length=64)
    last_name: str = Field(..., max_length=64)
    patronymic: Optional[str] = Field(None, max_length=64)
    sex: Optional[Literal["male", "female"]] = None
    birth_date: Optional[date] = None
    # True = the user confirmed the namesake modal; assign next dedupe number.
    allow_duplicate: bool = False
    effective_date: date = Field(..., description="Activation date")
    department_id: int = Field(..., description="Main department for the employee")
    job_id: int = Field(..., description="Job for the employee")
    description: Optional[str] = Field(None, max_length=512)


class EmployeeStatusNested(BaseModel):
    """Slim employee-status for nesting in EmployeeSchema."""

    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str


class EmployeePersonalDataUpdate(BaseModel):
    """Editable personal data (DD.MM.YYYY in the UI). Partial — only the fields
    actually sent are applied (model_dump(exclude_unset=True) in the service)."""

    birth_date: Optional[date] = None
    hire_date: Optional[date] = None
    job_assigned_date: Optional[date] = None
    sex: Optional[Literal["male", "female"]] = None
    marital_status: Optional[Literal["married", "not_married"]] = None


class EmployeeUpdate(BaseModel):
    # NOTE: no `name` here — employees.name is derived from the person
    # (PATCH /persons/{id} renames; the service rebuilds 'LAST FIRST').
    email: Optional[str] = Field(None, max_length=100)
    is_active: Optional[bool] = None
    job_id: Optional[int] = None
    lang_id: Optional[int] = None


class EmployeePersonSlim(BaseModel):
    """Slim person info nested in EmployeeSchema."""

    model_config = ConfigDict(from_attributes=True)
    id: int
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    patronymic: Optional[str] = None
    sex: Optional[str] = None
    birth_date: Optional[date] = None


class EmployeeSchema(EmployeeBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    person_id: Optional[int] = None
    person: Optional[EmployeePersonSlim] = None
    # 1=human, 2=robot (system accounts) — see EmployeeOrigin.
    origin_id: int = 1
    # Read-only — mirrors Employee.current_level_id @property (1:1 link table).
    current_level_id: Optional[int] = None
    # Read-only — mirror Employee.birth_date / hire_date @propertys (personal-data table).
    birth_date: Optional[date] = None
    hire_date: Optional[date] = None
    job_assigned_date: Optional[date] = None
    sex: Optional[str] = None
    marital_status: Optional[str] = None
    groups: List[str] = []  # populated via Employee.groups @property
    group_ids: List[int] = (
        []
    )  # populated via Employee.group_ids @property (rename-safe)
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
    status: Optional[EmployeeStatusNested] = None
    job: Optional["Job"] = None
    lang: Optional["Lang"] = None
    # Populated by EmployeeService._to_schema from the selectin-loaded relationships.
    main_department: Optional["MainDepartmentSchema"] = None  # single MAIN link
    responsibility_departments: List["MainDepartmentSchema"] = []


# ── Slim read schema used inside EmployeeSchema ───────────────────────────────
# We intentionally keep this minimal — just what the grid column needs.


class MainDepartmentSchema(BaseModel):
    """Slim department info embedded in EmployeeSchema (main_department and
    responsibility_departments)."""

    model_config = ConfigDict(from_attributes=True)
    id: int  # link-row id (useful for delete)
    department_id: int
    name: str  # department name — populated manually in _to_schema
    # Derived top-level org unit (board / directorate / store) for this
    # department. Resolved server-side by walking up the department tree.
    top_department: Optional[TopOrgUnit] = None
    # Department category sort_order, used by the frontend to sort filter
    # dropdown options (closest-department filter) in category order.
    department_category_sort_order: int = 0


# ── Late imports to avoid circular references ─────────────────────────────────
from backend.api_v1.job.job_schema import Job  # noqa: E402
from backend.api_v1.lang.lang_schema import Lang  # noqa: E402

EmployeeSchema.model_rebuild()
