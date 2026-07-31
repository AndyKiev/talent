# backend/api_v1/employee/employee_schema.py
from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

from backend.api_v1.department.department_org_units import TopOrgUnit


class EmployeeBase(BaseModel):
    # No `name` here: employees have no name column. It is a read-only derived
    # value (see EmployeeSchema.name) composed from the person's parts in the
    # requesting user's preferred order, so it is never an input field.
    code: str = Field(..., max_length=10)
    email: str | None = Field(None, max_length=100)
    is_active: bool = True
    job_id: int | None = Field(default=None)
    lang_id: int = Field(default=3)


class EmployeeCreate(EmployeeBase):
    # Physical person behind this employee (set by orchestration code that
    # created the person first; plain POST /employees may pass one directly).
    person_id: int | None = None


class EmployeeWithActivationCreate(EmployeeBase):
    """
    One-shot employee creation with an activation event.
    Reuses EmployeeBase for employee fields; adds activation fields.
    A person is created under the hood from the split name fields.
    """

    first_name: str = Field(..., max_length=64)
    last_name: str = Field(..., max_length=64)
    patronymic: str | None = Field(None, max_length=64)
    sex: Literal["male", "female"] | None = None
    birth_date: date | None = None
    # True = the user confirmed the namesake modal; assign next dedupe number.
    allow_duplicate: bool = False
    effective_date: date = Field(..., description="Activation date")
    department_id: int = Field(..., description="Main department for the employee")
    job_id: int = Field(..., description="Job for the employee")
    description: str | None = Field(None, max_length=512)


class EmployeeStatusNested(BaseModel):
    """Slim employee-status for nesting in EmployeeSchema."""

    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str


class EmployeePersonalDataUpdate(BaseModel):
    """Editable personal data (DD.MM.YYYY in the UI). Partial — only the fields
    actually sent are applied (model_dump(exclude_unset=True) in the service)."""

    birth_date: date | None = None
    hire_date: date | None = None
    job_assigned_date: date | None = None
    sex: Literal["male", "female"] | None = None
    marital_status: Literal["married", "not_married"] | None = None


class EmployeeUpdate(BaseModel):
    # NOTE: no `name` here — employees.name is derived from the person
    # (PATCH /persons/{id} renames; the service rebuilds 'LAST FIRST').
    email: str | None = Field(None, max_length=100)
    is_active: bool | None = None
    job_id: int | None = None
    lang_id: int | None = None


class EmployeePersonSlim(BaseModel):
    """Slim person info nested in EmployeeSchema."""

    model_config = ConfigDict(from_attributes=True)
    id: int
    first_name: str | None = None
    last_name: str | None = None
    patronymic: str | None = None
    sex: str | None = None
    birth_date: date | None = None


class EmployeeSchema(EmployeeBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    # Read-only — mirrors Employee.name @property: composed from the person's
    # parts in THIS viewer's order (surname_first_in_names). Never an input.
    name: str = ""
    created_at: datetime
    person_id: int | None = None
    person: EmployeePersonSlim | None = None
    # 1=human, 2=robot (system accounts) — see EmployeeOrigin.
    origin_id: int = 1
    # Read-only — mirrors Employee.current_level_id @property (1:1 link table).
    current_level_id: int | None = None
    # Read-only — mirror Employee.birth_date / hire_date @propertys (personal-data table).
    birth_date: date | None = None
    hire_date: date | None = None
    job_assigned_date: date | None = None
    sex: str | None = None
    marital_status: str | None = None
    groups: list[str] = []  # populated via Employee.groups @property
    group_ids: list[int] = (
        []
    )  # populated via Employee.group_ids @property (rename-safe)
    operations: list[str] = []  # DEPRECATED — kept during transition window

    # Resolved access-control grants, populated by EmployeeService._to_schema.
    # Excluded from serialization — used only by the has_access dependencies.
    permissions: frozenset[tuple[str, str]] = Field(
        default_factory=frozenset, exclude=True
    )
    permission_sets: frozenset[tuple[str, frozenset[str]]] = Field(
        default_factory=frozenset, exclude=True
    )
    # Superadmin / bypass-group flag, set in jwt_auth.get_current_auth_user.
    # Excluded from serialization — used only by the has_access dependencies.
    is_bypass: bool = Field(default=False, exclude=True)
    # Access-testing ("test as group") state, set in jwt_auth.get_current_auth_user.
    # `real_is_bypass` is the pre-override bypass flag (server-side entry gate);
    # `access_testing` / `can_access_test` are serialized for the frontend.
    real_is_bypass: bool = Field(default=False, exclude=True)
    access_testing: bool = False
    can_access_test: bool = False
    status: EmployeeStatusNested | None = None
    job: Optional["Job"] = None
    lang: Optional["Lang"] = None
    # Populated by EmployeeService._to_schema from the selectin-loaded relationships.
    main_department: Optional["MainDepartmentSchema"] = None  # single MAIN link
    # validation_alias points at a non-existent ORM attr so model_validate
    # (from_attributes) does NOT auto-pull the same-named ORM relationship
    # (list of EmployeeResponsibilityDepartment rows, which lack `name`) and
    # blow up. Populated manually in EmployeeService._to_schema; serialized
    # under the field name `responsibility_departments`.
    responsibility_departments: list["MainDepartmentSchema"] = Field(
        default=[], validation_alias="responsibility_departments_manual"
    )


# ── Slim read schema used inside EmployeeSchema ───────────────────────────────
# We intentionally keep this minimal — just what the grid column needs.


class MainDepartmentSchema(BaseModel):
    """Slim department info embedded in EmployeeSchema (main_department and
    responsibility_departments)."""

    model_config = ConfigDict(from_attributes=True)
    id: int  # link-row id (useful for delete)
    # main_department carries a department INSTANCE; responsibility_departments
    # carry a department TYPE — so exactly one of these id fields is set.
    department_id: int | None = None
    department_type_id: int | None = None
    name: str  # department (main) or type (responsibility) name — set in _to_schema
    # Derived top-level org unit (board / directorate / store) for this
    # department. Resolved server-side by walking up the department tree.
    top_department: TopOrgUnit | None = None
    # Department category sort_order, used by the frontend to sort filter
    # dropdown options (closest-department filter) in category order.
    department_category_sort_order: int = 0


# ── Late imports to avoid circular references ─────────────────────────────────
from backend.api_v1.job.job_schema import Job  # noqa: E402
from backend.api_v1.lang.lang_schema import Lang  # noqa: E402

EmployeeSchema.model_rebuild()
