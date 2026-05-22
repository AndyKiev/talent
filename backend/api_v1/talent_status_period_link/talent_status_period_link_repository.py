from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.talent_status_period_link.talent_status_period_link_model import TalentStatusPeriodLink


class TalentStatusPeriodLinkRepository(BaseRepository):

    model = TalentStatusPeriodLink

    async def get_by_composite_key(
        self,
        talent_period_id: int,
        talent_status_id: int,
    ) -> Optional[TalentStatusPeriodLink]:
        """Look up an existing link by the unique (period, status) pair."""
        stmt = select(self.model).where(
            self.model.talent_period_id == talent_period_id,
            self.model.talent_status_id == talent_status_id,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_period(self, talent_period_id: int) -> list[TalentStatusPeriodLink]:
        """All links for a given period."""
        stmt = (
            select(self.model)
            .where(self.model.talent_period_id == talent_period_id)
            .order_by(self.model.id)
        )
        result = await self.session.scalars(stmt)
        return list(result.all())

    async def get_by_status(self, talent_status_id: int) -> list[TalentStatusPeriodLink]:
        """All links for a given status."""
        stmt = (
            select(self.model)
            .where(self.model.talent_status_id == talent_status_id)
            .order_by(self.model.id)
        )
        result = await self.session.scalars(stmt)
        return list(result.all())
