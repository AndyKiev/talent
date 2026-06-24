from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime

from backend.api_v1.department_category.department_category_schema import (
    DepartmentCategory as DepartmentCategorySchema,
)
from backend.api_v1.department_type.department_type_schema import (
    DepartmentType as DepartmentTypeSchema,
)
from backend.api_v1.department.department_org_units import TopOrgUnit


class DepartmentBase(BaseModel):
    name: str = Field(..., max_length=128)
    is_active: bool = True
    parent_id: Optional[int] = None
    department_category_id: int
    department_type_id: int


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=128)
    is_active: Optional[bool] = None
    parent_id: Optional[int] = None
    department_category_id: Optional[int] = None
    department_type_id: Optional[int] = None


class Department(DepartmentBase):
    """
    Full department node — includes nested children (recursive tree).

    Pydantic resolves the self-reference via model_rebuild() called after
    the class body is defined. SQLAlchemy populates `children` via the
    selectin relationship on the ORM model.
    """

    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    department_category: Optional[DepartmentCategorySchema] = None
    department_type: Optional[DepartmentTypeSchema] = None
    children: List["Department"] = []


# Required to resolve the forward reference to self
Department.model_rebuild()


class DepartmentFlat(DepartmentBase):
    """
    Flat (non-recursive) department node — used for list endpoints
    where you do not need the full subtree (avoids loading the entire tree).
    """

    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    department_category: Optional[DepartmentCategorySchema] = None
    department_type: Optional[DepartmentTypeSchema] = None


class DepartmentSubtreeGenerateResult(BaseModel):
    """
    Summary returned by POST /departments/{id}/generate_subtree.
    `created` holds the newly inserted departments (flat); `created_count`
    is their number; `root_id` echoes the department the walk started from.
    """

    detail: str
    root_id: int
    created_count: int = 0
    created: List[DepartmentFlat] = []


class DepartmentTopResolution(BaseModel):
    """Maps a department id to its resolved top-level org unit (board /
    directorate / store), or null if none is found up the tree. Used by the
    employee job-history view to show main (top) + subordinate department."""

    department_id: int
    top: Optional[TopOrgUnit] = None
