
from sqlalchemy import select

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.employee_development_vision.employee_development_vision_model import (
    EmployeeDevelopmentVision,
)


class EmployeeDevelopmentVisionRepository(BaseRepository):
    model = EmployeeDevelopmentVision

    async def get_for_employee(
        self, employee_id: int
    ) -> EmployeeDevelopmentVision | None:
        stmt = select(EmployeeDevelopmentVision).where(
            EmployeeDevelopmentVision.employee_id == employee_id
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def upsert_for_employee(
        self, employee_id: int, text: str
    ) -> EmployeeDevelopmentVision:
        """One row per employee: edit in place when it exists, insert otherwise.

        Unlike the 1:1 LINK tables (which upsert by delete-then-insert) the row is
        updated in place here, so `created_at` keeps meaning "first written" while
        `updated_at` tracks revisions.
        """
        record = await self.get_for_employee(employee_id)
        if record is None:
            record = EmployeeDevelopmentVision(employee_id=employee_id, text=text)
            self.session.add(record)
        else:
            record.text = text
        await self.session.flush()
        return record
