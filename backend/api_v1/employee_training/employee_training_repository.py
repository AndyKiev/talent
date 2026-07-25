from collections.abc import Sequence

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.employee_training.employee_training_model import EmployeeTraining
from sqlalchemy import select


class EmployeeTrainingRepository(BaseRepository):
    model = EmployeeTraining

    async def get_for_employee(self, employee_id: int) -> Sequence[EmployeeTraining]:
        stmt = select(EmployeeTraining).where(
            EmployeeTraining.employee_id == employee_id
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_for_training_type(
        self, training_type_id: int
    ) -> Sequence[EmployeeTraining]:
        """Every assignment of one training type (any employee). `training_status`
        is selectin-loaded on the model, so `.training_status.key` is available."""
        stmt = select(EmployeeTraining).where(
            EmployeeTraining.training_type_id == training_type_id
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()
