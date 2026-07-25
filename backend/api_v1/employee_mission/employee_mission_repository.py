from collections.abc import Sequence

from sqlalchemy import select

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.employee_mission.employee_mission_model import EmployeeMission


class EmployeeMissionRepository(BaseRepository):
    """CRUD only — everything except get_for_employee is inherited."""

    model = EmployeeMission

    async def get_for_employee(self, employee_id: int) -> Sequence[EmployeeMission]:
        """An employee's missions, NEWEST FIRST.

        Ordering is part of the API contract (the UI shows recent plans on top and
        pales out the ones whose end_date has passed), so it lives here rather
        than in each caller. The nested kpis / comments / dimension_link are
        lazy="selectin", so this is a handful of queries regardless of row count.
        """
        stmt = (
            select(EmployeeMission)
            .where(EmployeeMission.employee_id == employee_id)
            .order_by(EmployeeMission.start_date.desc(), EmployeeMission.id.desc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()
