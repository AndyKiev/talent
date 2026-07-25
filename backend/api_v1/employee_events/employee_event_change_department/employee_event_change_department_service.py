
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.employee_events.employee_event_change_department.employee_event_change_department_messages import (
    EmployeeEventChangeDepartmentNotFound,
)
from backend.api_v1.employee_events.employee_event_change_department.employee_event_change_department_repository import (
    EmployeeEventChangeDepartmentRepository,
)
from backend.api_v1.employee_events.employee_event_change_department.employee_event_change_department_schema import (
    EmployeeEventChangeDepartmentSchema,
)


class EmployeeEventChangeDepartmentService(BaseService):
    """
    Read-only service. Rows in employee_event_change_departments are created
    and deleted exclusively through the parent EmployeeEvent write operations.
    """

    def __init__(
        self,
        repository: EmployeeEventChangeDepartmentRepository,
        user: EmployeeSchema | None = None,
        session: AsyncSession | None = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def get_by_id(self, record_id: int) -> EmployeeEventChangeDepartmentSchema:
        result = await self.repository.get_by_id(record_id)
        if not result:
            raise await self._resolve_domain_error(
                EmployeeEventChangeDepartmentNotFound(record_id)
            )
        return result

    async def get_employee_event_change_departments(
        self,
        event_change_id: int | None = None,
        sort: str | None = None,
    ) -> list[EmployeeEventChangeDepartmentSchema]:
        if event_change_id is not None:
            records = await self.get_all(
                filters={"event_change_id": event_change_id},
                sort_json=sort,
            )
        else:
            records = await self.get_all(sort_json=sort)
        return [EmployeeEventChangeDepartmentSchema.model_validate(r) for r in records]
