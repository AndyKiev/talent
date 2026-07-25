from collections.abc import Sequence

from sqlalchemy import select

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.employee_mission_comment.employee_mission_comment_model import (
    EmployeeMissionComment,
)


class EmployeeMissionCommentRepository(BaseRepository):
    model = EmployeeMissionComment

    async def get_for_mission(
        self, mission_id: int
    ) -> Sequence[EmployeeMissionComment]:
        """Newest first — a development conversation reads latest-on-top."""
        stmt = (
            select(EmployeeMissionComment)
            .where(EmployeeMissionComment.mission_id == mission_id)
            .order_by(EmployeeMissionComment.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()
