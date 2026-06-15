from typing import Optional, List

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.process_roles.process_role_holder_employee_link.process_role_holder_employee_link_repository import (
    ProcessRoleHolderEmployeeLinkRepository,
)
from backend.api_v1.process_roles.process_role_holder_employee_link.process_role_holder_employee_link_schema import (
    ProcessRoleHolderEmployeeLink as ProcessRoleHolderEmployeeLinkSchema,
    ProcessRoleHolderEmployeeLinkCreate,
)
from backend.api_v1.process_roles.process_role_holder.process_role_holder_repository import (
    ProcessRoleHolderRepository,
)
from backend.api_v1.process_roles.process_role_holder.process_role_holder_errors import (
    ProcessRoleHolderNotFound,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.process_roles.process_role_holder_employee_link.process_role_holder_employee_link_errors import (
    ProcessRoleHolderEmployeeNotFound,
    ProcessRoleHolderEmployeeExists,
    ProcessRoleHolderEmployeeSelf,
    ProcessRoleHolderEmployeeDeleteError,
)
from backend.api_v1.process_roles.process_role_holder_employee_link.process_role_holder_employee_link_success import (
    ProcessRoleHolderEmployeeCreateSuccess,
    ProcessRoleHolderEmployeeDeleteSuccess,
)


class ProcessRoleHolderEmployeeLinkService(BaseService):
    def __init__(
        self,
        repository: ProcessRoleHolderEmployeeLinkRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)
        self.holder_repository = ProcessRoleHolderRepository(session=session)

    async def get_by_id(self, id: int) -> ProcessRoleHolderEmployeeLinkSchema:
        result = await self.repository.get_by_id(id)
        if not result:
            raise await self._resolve_domain_error(
                ProcessRoleHolderEmployeeNotFound(id)
            )
        return result

    async def get_roster_employee_ids(
        self,
        holder_employee_id: int,
        process_key: str,
        role_key: str,
    ) -> set[int]:
        """Roster resolver (§5/§9): employees `holder_employee_id` covers for a
        given process+role. Matches on stable keys. The single entry point a
        consuming module uses to scope visibility to a reviewer's roster."""
        return await self.repository.get_roster_employee_ids(
            holder_employee_id, process_key, role_key
        )

    async def get_links(
        self,
        process_role_holder_id: Optional[int] = None,
        process_role_id: Optional[int] = None,
        employee_id: Optional[int] = None,
        sort: Optional[str] = None,
    ) -> List[ProcessRoleHolderEmployeeLinkSchema]:
        filters = {}
        if process_role_holder_id is not None:
            filters["process_role_holder_id"] = process_role_holder_id
        if process_role_id is not None:
            filters["process_role_id"] = process_role_id
        if employee_id is not None:
            filters["employee_id"] = employee_id
        records = await self.get_all(params=filters or None, sort_json=sort)
        return [
            ProcessRoleHolderEmployeeLinkSchema.model_validate(r) for r in records
        ]

    async def create_link(
        self, link_in: ProcessRoleHolderEmployeeLinkCreate
    ) -> MutationResponse[ProcessRoleHolderEmployeeLinkSchema]:
        holder = await self.holder_repository.get_by_id(link_in.process_role_holder_id)
        if not holder:
            raise await self._resolve_domain_error(
                ProcessRoleHolderNotFound(link_in.process_role_holder_id)
            )
        # no self-review: a holder cannot be assigned to themselves
        if link_in.employee_id == holder.holder_employee_id:
            raise await self._resolve_domain_error(ProcessRoleHolderEmployeeSelf())

        data = link_in.model_dump()
        data["process_role_id"] = holder.process_role_id  # set from holder, never client
        try:
            record = await self.create_from_dict(data)
            fresh = await self.repository.get_by_id(record.id)
            schema = ProcessRoleHolderEmployeeLinkSchema.model_validate(fresh)
            label = (
                schema.employee_name
                or schema.employee_code
                or str(schema.employee_id)
            )
            detail = await self._resolve_domain_success(
                ProcessRoleHolderEmployeeCreateSuccess(label)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                ProcessRoleHolderEmployeeExists(str(link_in.employee_id))
            )

    async def delete_link(self, link_id: int) -> None:
        record = await self.get_by_id(link_id)
        label = (
            record.employee_name or record.employee_code or str(record.employee_id)
        )
        await self.delete_by_id(
            link_id,
            name=label,
            delete_error_exc=ProcessRoleHolderEmployeeDeleteError,
            delete_success_exc=ProcessRoleHolderEmployeeDeleteSuccess,
        )
