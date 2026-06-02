from __future__ import annotations

from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

from backend.api_v1.department_category.department_category_schema import (
    DepartmentCategory as DepartmentCategorySchema,
)


class PlanSessionCategoryBase(BaseModel):
    plan_session_id: int
    department_category_id: int


class PlanSessionCategory(PlanSessionCategoryBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    department_category: Optional[DepartmentCategorySchema] = None
