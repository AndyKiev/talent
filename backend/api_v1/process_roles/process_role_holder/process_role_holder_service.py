from typing import Optional, List

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.process_roles.process_role_holder.process_role_holder_repository import (
    ProcessRoleHolderRepository,
)
from backend.api_v1.process_roles.process_role_holder.process_role_holder_schema import (
    ProcessRoleHolder as ProcessRoleHolderSchema,
    ProcessRoleHolderCreate,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.process_roles.process_role_holder.process_role_holder_errors import (
    ProcessRoleHolderNotFound,
    ProcessRoleHolderExists,
    ProcessRoleHolderDeleteError,
)
from backend.api_v1.process_roles.process_role_holder.process_role_holder_success import (
    ProcessRoleHolderCreateSuccess,
    ProcessRoleHolderDeleteSuccess,
)


class ProcessRoleHolderService(BaseService):
    def __init__(
        self,
        repository: ProcessRoleHolderRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def get_by_id(self, id: int) -> ProcessRoleHolderSchema:
        result = await self.repository.get_by_id(id)
        if not result:
            raise await self._resolve_domain_error(ProcessRoleHolderNotFound(id))
        return result

    async def get_holders(
        self,
        process_role_id: Optional[int] = None,
        holder_employee_id: Optional[int] = None,
        sort: Optional[str] = None,
    ) -> List[ProcessRoleHolderSchema]:
        filters = {}
        if process_role_id is not None:
            filters["process_role_id"] = process_role_id
        if holder_employee_id is not None:
            filters["holder_employee_id"] = holder_employee_id
        records = await self.get_all(params=filters or None, sort_json=sort)
        return [ProcessRoleHolderSchema.model_validate(r) for r in records]

    async def create_holder(
        self, holder_in: ProcessRoleHolderCreate
    ) -> MutationResponse[ProcessRoleHolderSchema]:
        data = holder_in.model_dump()
        data["assigned_by"] = self.user.id if self.user else None
        try:
            record = await self.create_from_dict(data)
            # re-fetch so selectin relationships (holder/assigner/role names) are loaded
            fresh = await self.repository.get_by_id(record.id)
            schema = ProcessRoleHolderSchema.model_validate(fresh)
            label = (
                schema.holder_name
                or schema.holder_code
                or str(schema.holder_employee_id)
            )
            detail = await self._resolve_domain_success(
                ProcessRoleHolderCreateSuccess(label)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                ProcessRoleHolderExists(str(holder_in.holder_employee_id))
            )

    async def delete_holder(self, holder_id: int) -> None:
        record = await self.get_by_id(holder_id)
        label = (
            record.holder_name
            or record.holder_code
            or str(record.holder_employee_id)
        )
        await self.delete_by_id(
            holder_id,
            name=label,
            delete_error_exc=ProcessRoleHolderDeleteError,
            delete_success_exc=ProcessRoleHolderDeleteSuccess,
        )
