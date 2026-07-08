from typing import Optional, List

from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee_education.employee_education_repository import (
    EmployeeEducationRepository,
)
from backend.api_v1.employee_education.employee_education_schema import (
    EmployeeEducation as EmployeeEducationSchema,
    EmployeeEducationCreate,
    EmployeeEducationUpdate,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.employee_education.employee_education_messages import (
    EmployeeEducationNotFound,
    EmployeeEducationDeleteError,
)
from backend.api_v1.employee_education.employee_education_messages import (
    EmployeeEducationDeleteSuccess,
    EmployeeEducationCreateSuccess,
    EmployeeEducationUpdateSuccess,
)


class EmployeeEducationService(BaseService):
    def __init__(
        self,
        repository: EmployeeEducationRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def get_by_id(self, id: int):
        result = await self.repository.get_by_id(id)
        if not result:
            exc = EmployeeEducationNotFound(id)
            raise await self._resolve_domain_error(exc)
        return result

    async def list_by_employee(self, employee_id: int) -> List[EmployeeEducationSchema]:
        records = await self.get_all(
            params={"employee_id": employee_id},
            sort_json='{"graduation_year": "desc"}',
        )
        return [EmployeeEducationSchema.model_validate(r) for r in records]

    async def create_education(
        self, education_in: EmployeeEducationCreate
    ) -> MutationResponse[EmployeeEducationSchema]:
        # Returns the freshly-created row directly — the schema touches only
        # column attributes (no degree relationship), so no lazy-load / re-fetch.
        record = await self.create(education_in)
        schema = EmployeeEducationSchema.model_validate(record)
        detail = await self._resolve_domain_success(
            EmployeeEducationCreateSuccess(schema.institution)
        )
        return MutationResponse(detail=detail, data=schema)

    async def update_education(
        self, education_id: int, education_update: EmployeeEducationUpdate
    ) -> MutationResponse[EmployeeEducationSchema]:
        orm_record = await self.get_by_id(education_id)
        updated = await self.update(orm_record, education_update, partial=True)
        schema = EmployeeEducationSchema.model_validate(updated)
        detail = await self._resolve_domain_success(
            EmployeeEducationUpdateSuccess(schema.institution)
        )
        return MutationResponse(detail=detail, data=schema)

    async def delete_education(self, education_id: int) -> None:
        record = await self.get_by_id(education_id)
        await self.delete_by_id(
            education_id,
            name=record.institution,
            delete_error_exc=EmployeeEducationDeleteError,
            delete_success_exc=EmployeeEducationDeleteSuccess,
        )
