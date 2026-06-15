from typing import Optional, List

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.process_roles.process_role.process_role_repository import (
    ProcessRoleRepository,
)
from backend.api_v1.process_roles.process_role.process_role_schema import (
    ProcessRole as ProcessRoleSchema,
    ProcessRoleCreate,
    ProcessRoleUpdate,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.process_roles.process_role.process_role_errors import (
    ProcessRoleNotFound,
    ProcessRoleNameTaken,
    ProcessRoleDeleteError,
)
from backend.api_v1.process_roles.process_role.process_role_success import (
    ProcessRoleCreateSuccess,
    ProcessRoleUpdateSuccess,
    ProcessRoleDeleteSuccess,
)


class ProcessRoleService(BaseService):
    def __init__(
        self,
        repository: ProcessRoleRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def get_by_id(self, id: int) -> ProcessRoleSchema:
        result = await self.repository.get_by_id(id)
        if not result:
            raise await self._resolve_domain_error(ProcessRoleNotFound(id))
        return result

    async def get_process_roles(
        self,
        process_id: Optional[int] = None,
        is_active: Optional[bool] = None,
        sort: Optional[str] = None,
    ) -> List[ProcessRoleSchema]:
        filters = {}
        if process_id is not None:
            filters["process_id"] = process_id
        if is_active is not None:
            filters["is_active"] = is_active
        records = await self.get_all(params=filters or None, sort_json=sort)
        return [ProcessRoleSchema.model_validate(r) for r in records]

    async def create_process_role(
        self, role_in: ProcessRoleCreate
    ) -> MutationResponse[ProcessRoleSchema]:
        try:
            record = await self.create(role_in)
            # re-fetch so the selectin `process` relationship (process_name) is loaded
            fresh = await self.repository.get_by_id(record.id)
            schema = ProcessRoleSchema.model_validate(fresh)
            detail = await self._resolve_domain_success(
                ProcessRoleCreateSuccess(schema.name)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(ProcessRoleNameTaken(role_in.name))

    async def update_process_role(
        self, role_id: int, role_update: ProcessRoleUpdate
    ) -> MutationResponse[ProcessRoleSchema]:
        try:
            orm_record = await self.get_by_id(role_id)
            await self.update(orm_record, role_update, partial=True)
            fresh = await self.repository.get_by_id(role_id)
            schema = ProcessRoleSchema.model_validate(fresh)
            detail = await self._resolve_domain_success(
                ProcessRoleUpdateSuccess(schema.name)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                ProcessRoleNameTaken(role_update.name or "")
            )

    async def delete_process_role(self, role_id: int) -> None:
        record = await self.get_by_id(role_id)
        await self.delete_by_id(
            role_id,
            name=record.name,
            delete_error_exc=ProcessRoleDeleteError,
            delete_success_exc=ProcessRoleDeleteSuccess,
        )
