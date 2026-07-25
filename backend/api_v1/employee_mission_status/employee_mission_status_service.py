
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.employee_mission_status.employee_mission_status_messages import (
    EmployeeMissionStatusCreateSuccess,
    EmployeeMissionStatusNotFound,
    EmployeeMissionStatusUpdateSuccess,
)
from backend.api_v1.employee_mission_status.employee_mission_status_repository import (
    EmployeeMissionStatusRepository,
)
from backend.api_v1.employee_mission_status.employee_mission_status_schema import (
    EmployeeMissionStatus as StatusSchema,
)
from backend.api_v1.employee_mission_status.employee_mission_status_schema import (
    EmployeeMissionStatusCreate,
    EmployeeMissionStatusUpdate,
)


class EmployeeMissionStatusService(BaseService):
    """A small lookup essence — everything ordinary comes from BaseService.

    The rows themselves are seeded (planned / in_process / completed) because the
    mission service resolves them BY KEY when it recomputes a status; renaming a
    key would break that resolution, which is why the key is unique.
    """

    def __init__(
        self,
        repository: EmployeeMissionStatusRepository,
        user: EmployeeSchema | None = None,
        session: AsyncSession | None = None,
    ) -> None:
        super().__init__(repository, user=user, session=session)

    async def get_by_id(self, id: int):
        record = await self.repository.get_by_id(id)
        if not record:
            raise await self._resolve_domain_error(EmployeeMissionStatusNotFound(id))
        return record

    async def create_status(
        self, payload: EmployeeMissionStatusCreate
    ) -> MutationResponse[StatusSchema]:
        record = await self.create(payload)
        schema = StatusSchema.model_validate(record)
        detail = await self._resolve_domain_success(
            EmployeeMissionStatusCreateSuccess(schema.key)
        )
        return MutationResponse(detail=detail, data=schema)

    async def update_status(
        self, status_id: int, payload: EmployeeMissionStatusUpdate
    ) -> MutationResponse[StatusSchema]:
        record = await self.get_by_id(status_id)
        updated = await self.update(record, payload)
        schema = StatusSchema.model_validate(updated)
        detail = await self._resolve_domain_success(
            EmployeeMissionStatusUpdateSuccess(schema.key)
        )
        return MutationResponse(detail=detail, data=schema)
