from typing import Optional

from sqlalchemy import delete, select

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.employee_mission_dimension_link.employee_mission_dimension_link_model import (
    EmployeeMissionDimensionLink,
)


class EmployeeMissionDimensionLinkRepository(BaseRepository):
    model = EmployeeMissionDimensionLink

    async def get_for_mission(
        self, mission_id: int
    ) -> Optional[EmployeeMissionDimensionLink]:
        stmt = select(EmployeeMissionDimensionLink).where(
            EmployeeMissionDimensionLink.mission_id == mission_id
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def set_for_mission(
        self, mission_id: int, dimension_id: int
    ) -> EmployeeMissionDimensionLink:
        """Upsert: a mission has at most one competence, so replace any existing
        row rather than inserting a second one (the unique constraint on
        mission_id would reject that anyway)."""
        await self.session.execute(
            delete(EmployeeMissionDimensionLink).where(
                EmployeeMissionDimensionLink.mission_id == mission_id
            )
        )
        self.session.add(
            EmployeeMissionDimensionLink(
                mission_id=mission_id, dimension_id=dimension_id
            )
        )
        await self.session.flush()
        return await self.get_for_mission(mission_id)

    async def clear_for_mission(self, mission_id: int) -> bool:
        """Remove the competence from a mission. Returns whether a row went."""
        existing = await self.get_for_mission(mission_id)
        if existing is None:
            return False
        await self.session.execute(
            delete(EmployeeMissionDimensionLink).where(
                EmployeeMissionDimensionLink.mission_id == mission_id
            )
        )
        await self.session.flush()
        return True
