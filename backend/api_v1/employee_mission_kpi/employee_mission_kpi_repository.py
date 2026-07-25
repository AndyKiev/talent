from collections.abc import Sequence

from sqlalchemy import func, select

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.employee_mission_kpi.employee_mission_kpi_model import (
    EmployeeMissionKpi,
)


class EmployeeMissionKpiRepository(BaseRepository):
    """CRUD only — the rest is inherited from BaseRepository."""

    model = EmployeeMissionKpi

    async def get_for_mission(self, mission_id: int) -> Sequence[EmployeeMissionKpi]:
        stmt = (
            select(EmployeeMissionKpi)
            .where(EmployeeMissionKpi.mission_id == mission_id)
            .order_by(EmployeeMissionKpi.sort_order, EmployeeMissionKpi.id)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def count_for_mission(self, mission_id: int) -> int:
        """Backs the "must keep at least one KPI" delete check. A COUNT rather
        than len(get_for_mission()) so the guard never loads rows it discards."""
        total = await self.session.scalar(
            select(func.count())
            .select_from(EmployeeMissionKpi)
            .where(EmployeeMissionKpi.mission_id == mission_id)
        )
        return int(total or 0)

    async def max_sort_order(self, mission_id: int) -> int:
        top = await self.session.scalar(
            select(func.max(EmployeeMissionKpi.sort_order)).where(
                EmployeeMissionKpi.mission_id == mission_id
            )
        )
        return int(top or 0)
