from typing import Optional, List

from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee_child.employee_child_repository import (
    EmployeeChildRepository,
)
from backend.api_v1.employee_child.employee_child_schema import (
    EmployeeChild as EmployeeChildSchema,
    EmployeeChildCreate,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.employee_child.employee_child_errors import (
    EmployeeChildNotFound,
    EmployeeChildDeleteError,
)
from backend.api_v1.employee_child.employee_child_success import (
    EmployeeChildDeleteSuccess,
    EmployeeChildCreateSuccess,
)


class EmployeeChildService(BaseService):
    def __init__(
        self,
        repository: EmployeeChildRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def get_by_id(self, id: int):
        result = await self.repository.get_by_id(id)
        if not result:
            exc = EmployeeChildNotFound(id)
            raise await self._resolve_domain_error(exc)
        return result

    async def list_by_employee(self, employee_id: int) -> List[EmployeeChildSchema]:
        records = await self.get_all(
            params={"employee_id": employee_id},
            sort_json='{"birth_date": "desc"}',
        )
        return [EmployeeChildSchema.model_validate(r) for r in records]

    async def create_child(
        self, child_in: EmployeeChildCreate
    ) -> MutationResponse[EmployeeChildSchema]:
        # Returns the freshly-created row directly — the schema touches only
        # column attributes, so no lazy-load / re-fetch is needed.
        record = await self.create(child_in)
        schema = EmployeeChildSchema.model_validate(record)
        detail = await self._resolve_domain_success(
            EmployeeChildCreateSuccess(str(schema.birth_date))
        )
        return MutationResponse(detail=detail, data=schema)

    async def delete_child(self, child_id: int) -> None:
        record = await self.get_by_id(child_id)
        await self.delete_by_id(
            child_id,
            name=str(record.birth_date),
            delete_error_exc=EmployeeChildDeleteError,
            delete_success_exc=EmployeeChildDeleteSuccess,
        )
