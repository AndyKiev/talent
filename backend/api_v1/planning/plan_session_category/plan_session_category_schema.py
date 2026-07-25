from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict

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
    department_category: DepartmentCategorySchema | None = None
