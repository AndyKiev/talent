# backend/api_v1/planning/plan_matrix/plan_matrix_repository.py
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from sqlalchemy import select

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.planning.plan_scope.plan_scope_model import PlanScope
from backend.api_v1.department.department_model import Department
from backend.api_v1.department_category.department_category_model import (
    DepartmentCategory,
)
from backend.api_v1.job_group.job_group_model import JobGroup
from backend.api_v1.talent_status.talent_status_model import TalentStatus
from backend.api_v1.department_region_link.department_region_link_model import (
    DepartmentRegionLink,
)
from backend.api_v1.region.region_model import Region


# Category key that marks a department instance as a store.
STORE_CATEGORY_KEY = "store"


@dataclass(frozen=True)
class ScopeRow:
    """Flattened valued plan scope restricted to store departments."""
    department_id: int
    department_name: str
    job_group_id: int
    job_group_key: str
    job_group_name: str
    talent_status_id: Optional[int]
    talent_status_key: Optional[str]
    talent_status_name: Optional[str]
    region_id: Optional[int]
    region_key: Optional[str]
    region_name: Optional[str]
    region_sort_order: Optional[int]
    value: int


class PlanMatrixRepository(BaseRepository):
    # No own table; report is read-only over plan_scopes.
    model = PlanScope

    async def get_store_valued_scopes(
        self, plan_session_id: int
    ) -> list[ScopeRow]:
        """Active, valued (NOT NULL) plan scopes of a session whose department
        is a STORE instance (department_category.key == 'store').

        Flattened with job-group and talent-status keys/names so the matrix
        service can build the pivot without extra round-trips or lazy loads.
        """
        stmt = (
            select(
                PlanScope.department_id,
                Department.name.label("department_name"),
                PlanScope.job_group_id,
                JobGroup.key.label("job_group_key"),
                JobGroup.name.label("job_group_name"),
                PlanScope.talent_status_id,
                TalentStatus.key.label("talent_status_key"),
                TalentStatus.name.label("talent_status_name"),
                Region.id.label("region_id"),
                Region.key.label("region_key"),
                Region.name.label("region_name"),
                Region.sort_order.label("region_sort_order"),
                PlanScope.value,
            )
            .join(Department, Department.id == PlanScope.department_id)
            .join(
                DepartmentCategory,
                DepartmentCategory.id == Department.department_category_id,
            )
            .join(JobGroup, JobGroup.id == PlanScope.job_group_id)
            .outerjoin(
                TalentStatus, TalentStatus.id == PlanScope.talent_status_id
            )
            .outerjoin(
                DepartmentRegionLink,
                DepartmentRegionLink.department_id == PlanScope.department_id,
            )
            .outerjoin(Region, Region.id == DepartmentRegionLink.region_id)
            .where(
                PlanScope.plan_session_id == plan_session_id,
                PlanScope.is_active.is_(True),
                PlanScope.value.is_not(None),
                DepartmentCategory.key == STORE_CATEGORY_KEY,
            )
            .order_by(
                Region.sort_order.nulls_last(),
                Department.name,
                JobGroup.id,
                PlanScope.talent_status_id,
            )
        )
        result = await self.session.execute(stmt)
        return [
            ScopeRow(
                department_id=row.department_id,
                department_name=row.department_name,
                job_group_id=row.job_group_id,
                job_group_key=row.job_group_key,
                job_group_name=row.job_group_name,
                talent_status_id=row.talent_status_id,
                talent_status_key=row.talent_status_key,
                talent_status_name=row.talent_status_name,
                region_id=row.region_id,
                region_key=row.region_key,
                region_name=row.region_name,
                region_sort_order=row.region_sort_order,
                value=int(row.value),
            )
            for row in result.all()
        ]
