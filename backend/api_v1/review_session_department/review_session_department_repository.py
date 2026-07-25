from sqlalchemy import select

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.review_session_department.review_session_department_model import (
    ReviewSessionDepartment,
)


class ReviewSessionDepartmentRepository(BaseRepository):
    model = ReviewSessionDepartment

    async def get_by_session(self, session_id: int) -> list[ReviewSessionDepartment]:
        stmt = select(self.model).where(self.model.session_id == session_id)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_session_and_department(
        self, session_id: int, department_id: int
    ) -> ReviewSessionDepartment | None:
        stmt = select(self.model).where(
            self.model.session_id == session_id,
            self.model.department_id == department_id,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_department_names_by_session_ids(
        self, session_ids: list[int]
    ) -> dict[int, str]:
        """Return {session_id: department_name} for the first linked department per session."""
        if not session_ids:
            return {}
        from backend.api_v1.department.department_model import Department

        stmt = (
            select(self.model.session_id, Department.name)
            .join(Department, self.model.department_id == Department.id)
            .where(self.model.session_id.in_(session_ids))
            .order_by(self.model.session_id, self.model.id)
        )
        result = await self.session.execute(stmt)
        # Take the first department name per session (DISTINCT ON would be cleaner
        # but this is simpler and session lists are small).
        seen: dict[int, str] = {}
        for row in result.all():
            sid = row[0]
            if sid not in seen:
                seen[sid] = row[1]
        return seen
