from sqlalchemy import select

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.planning.plan_scope.plan_scope_model import PlanScope


class PlanScopeRepository(BaseRepository):
    model = PlanScope

    async def get_by_session(self, plan_session_id: int) -> list[PlanScope]:
        stmt = (
            select(self.model)
            .where(self.model.plan_session_id == plan_session_id)
            .order_by(
                self.model.department_id,
                self.model.job_group_id,
                self.model.talent_status_id,
            )
        )
        result = await self.session.scalars(stmt)
        return list(result.all())
