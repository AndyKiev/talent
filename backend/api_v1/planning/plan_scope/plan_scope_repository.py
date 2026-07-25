from sqlalchemy import select

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.department.department_model import Department
from backend.api_v1.department_region_link.department_region_link_model import (
    DepartmentRegionLink,
)
from backend.api_v1.planning.plan_scope.plan_scope_model import PlanScope
from backend.api_v1.region.region_model import Region


class PlanScopeRepository(BaseRepository):
    model = PlanScope

    async def get_by_session(self, plan_session_id: int) -> list[PlanScope]:
        """Scopes of a session, ordered by department category, then region
        sort_order (nulls last), then department name, then job group and
        talent status. The user can re-sort in the grid; this is the default.
        """
        stmt = (
            select(self.model)
            .join(Department, Department.id == self.model.department_id)
            .outerjoin(
                DepartmentRegionLink,
                DepartmentRegionLink.department_id == self.model.department_id,
            )
            .outerjoin(Region, Region.id == DepartmentRegionLink.region_id)
            .where(self.model.plan_session_id == plan_session_id)
            .order_by(
                Department.department_category_id,
                Region.sort_order.nulls_last(),
                Department.name,
                self.model.job_group_id,
                self.model.talent_status_id,
            )
        )
        result = await self.session.scalars(stmt)
        return list(result.all())

    async def get_region_map(self, department_ids: set[int]) -> dict[int, Region]:
        """department_id -> Region (only for departments that have a link).

        Region↔department is one-to-one, so each department maps to at most
        one region.
        """
        if not department_ids:
            return {}
        stmt = (
            select(DepartmentRegionLink.department_id, Region)
            .join(Region, Region.id == DepartmentRegionLink.region_id)
            .where(DepartmentRegionLink.department_id.in_(department_ids))
        )
        result = await self.session.execute(stmt)
        return {dep_id: region for dep_id, region in result.all()}
