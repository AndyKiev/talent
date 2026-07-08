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
from backend.api_v1.employee.employee_errors import EmployeeNotFound
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

    async def _person_id_for_employee(self, employee_id: int) -> int:
        """Children belong to the PERSON; the HTTP API still speaks employee_id."""
        from sqlalchemy import select
        from backend.api_v1.employee.employee_model import Employee

        person_id = await self.repository.session.scalar(
            select(Employee.person_id).where(Employee.id == employee_id)
        )
        if person_id is None:
            raise await self._resolve_domain_error(EmployeeNotFound(employee_id))
        return person_id

    async def list_by_employee(self, employee_id: int) -> List[EmployeeChildSchema]:
        person_id = await self._person_id_for_employee(employee_id)
        records = await self.get_all(
            params={"person_id": person_id},
            sort_json='{"birth_date": "desc"}',
        )
        return [EmployeeChildSchema.model_validate(r) for r in records]

    async def create_child(
        self, child_in: EmployeeChildCreate
    ) -> MutationResponse[EmployeeChildSchema]:
        person_id = await self._person_id_for_employee(child_in.employee_id)
        # Returns the freshly-created row directly — the schema touches only
        # column attributes, so no lazy-load / re-fetch is needed.
        record = await self.create_from_dict(
            {"person_id": person_id, "birth_date": child_in.birth_date}
        )
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
