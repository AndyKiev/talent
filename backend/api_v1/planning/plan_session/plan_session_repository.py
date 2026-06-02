from datetime import date

from sqlalchemy import select, func

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.planning.plan_session.plan_session_model import PlanSession
from backend.api_v1.planning.plan_session_status.plan_session_status_model import (
    PlanSessionStatus,
)


class PlanSessionRepository(BaseRepository):
    model = PlanSession

    async def get_all_ordered(self) -> list[PlanSession]:
        """Latest sessions first (by start_date desc, then id desc)."""
        stmt = select(self.model).order_by(
            self.model.start_date.desc(),
            self.model.id.desc(),
        )
        result = await self.session.scalars(stmt)
        return list(result.all())

    async def get_overlapping(
        self,
        start_date: date,
        end_date: date,
        exclude_id: int | None = None,
    ) -> list[PlanSession]:
        """Sessions whose date range intersects [start_date, end_date].

        Overlap iff existing.start_date <= end_date AND existing.end_date >= start_date.
        """
        stmt = select(self.model).where(
            self.model.start_date <= end_date,
            self.model.end_date >= start_date,
        )
        if exclude_id is not None:
            stmt = stmt.where(self.model.id != exclude_id)
        result = await self.session.scalars(stmt)
        return list(result.all())

    async def count_by_status_keys(
        self,
        keys: list[str],
        exclude_id: int | None = None,
    ) -> int:
        """Count sessions whose status key is in `keys`."""
        stmt = (
            select(func.count(self.model.id))
            .join(PlanSessionStatus, self.model.plan_session_status_id == PlanSessionStatus.id)
            .where(PlanSessionStatus.key.in_(keys))
        )
        if exclude_id is not None:
            stmt = stmt.where(self.model.id != exclude_id)
        result = await self.session.execute(stmt)
        return int(result.scalar_one())
