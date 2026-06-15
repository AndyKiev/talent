from typing import Optional, List

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.process_roles.process.process_repository import ProcessRepository
from backend.api_v1.process_roles.process.process_schema import (
    Process as ProcessSchema,
    ProcessCreate,
    ProcessUpdate,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.process_roles.process.process_errors import (
    ProcessNotFound,
    ProcessNameTaken,
    ProcessDeleteError,
)
from backend.api_v1.process_roles.process.process_success import (
    ProcessCreateSuccess,
    ProcessUpdateSuccess,
    ProcessDeleteSuccess,
)


class ProcessService(BaseService):
    def __init__(
        self,
        repository: ProcessRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def get_by_id(self, id: int) -> ProcessSchema:
        result = await self.repository.get_by_id(id)
        if not result:
            raise await self._resolve_domain_error(ProcessNotFound(id))
        return result

    async def get_processes(
        self,
        is_active: Optional[bool] = None,
        sort: Optional[str] = None,
    ) -> List[ProcessSchema]:
        filters = {}
        if is_active is not None:
            filters["is_active"] = is_active
        records = await self.get_all(params=filters or None, sort_json=sort)
        return [ProcessSchema.model_validate(r) for r in records]

    async def create_process(
        self, process_in: ProcessCreate
    ) -> MutationResponse[ProcessSchema]:
        await self.exists_by_name(process_in.name, already_exists_exc=ProcessNameTaken)
        try:
            record = await self.create(process_in)
            schema = ProcessSchema.model_validate(record)
            detail = await self._resolve_domain_success(ProcessCreateSuccess(schema.name))
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(ProcessNameTaken(process_in.name))

    async def update_process(
        self, process_id: int, process_update: ProcessUpdate
    ) -> MutationResponse[ProcessSchema]:
        if process_update.name:
            await self.exists_by_name(
                process_update.name, already_exists_exc=ProcessNameTaken
            )
        try:
            orm_record = await self.get_by_id(process_id)
            updated = await self.update(orm_record, process_update, partial=True)
            schema = ProcessSchema.model_validate(updated)
            detail = await self._resolve_domain_success(ProcessUpdateSuccess(schema.name))
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                ProcessNameTaken(process_update.name or "")
            )

    async def delete_process(self, process_id: int) -> None:
        record = await self.get_by_id(process_id)
        await self.delete_by_id(
            process_id,
            name=record.name,
            delete_error_exc=ProcessDeleteError,
            delete_success_exc=ProcessDeleteSuccess,
        )
