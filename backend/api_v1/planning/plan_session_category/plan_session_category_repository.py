from sqlalchemy import select

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.planning.plan_session_category.plan_session_category_model import (
    PlanSessionCategory,
)


class PlanSessionCategoryRepository(BaseRepository):
    model = PlanSessionCategory

    async def get_by_session(self, plan_session_id: int) -> list[PlanSessionCategory]:
        stmt = (
            select(self.model)
            .where(self.model.plan_session_id == plan_session_id)
            .order_by(self.model.id)
        )
        result = await self.session.scalars(stmt)
        return list(result.all())
