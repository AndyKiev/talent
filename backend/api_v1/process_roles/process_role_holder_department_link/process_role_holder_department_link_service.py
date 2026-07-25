
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.process_roles.process_role_holder.process_role_holder_messages import (
    ProcessRoleHolderNotFound,
)
from backend.api_v1.process_roles.process_role_holder.process_role_holder_repository import (
    ProcessRoleHolderRepository,
)
from backend.api_v1.process_roles.process_role_holder_department_link.process_role_holder_department_link_messages import (
    ProcessRoleHolderDepartmentCreateSuccess,
    ProcessRoleHolderDepartmentDeleteError,
    ProcessRoleHolderDepartmentDeleteSuccess,
    ProcessRoleHolderDepartmentExists,
    ProcessRoleHolderDepartmentNotFound,
)
from backend.api_v1.process_roles.process_role_holder_department_link.process_role_holder_department_link_repository import (
    ProcessRoleHolderDepartmentLinkRepository,
)
from backend.api_v1.process_roles.process_role_holder_department_link.process_role_holder_department_link_schema import (
    ProcessRoleHolderDepartmentLink as ProcessRoleHolderDepartmentLinkSchema,
)
from backend.api_v1.process_roles.process_role_holder_department_link.process_role_holder_department_link_schema import (
    ProcessRoleHolderDepartmentLinkCreate,
)


class ProcessRoleHolderDepartmentLinkService(BaseService):
    def __init__(
        self,
        repository: ProcessRoleHolderDepartmentLinkRepository,
        user: EmployeeSchema | None = None,
        session: AsyncSession | None = None,
    ):
        super().__init__(repository, user=user, session=session)
        self.holder_repository = ProcessRoleHolderRepository(session=session)

    async def get_by_id(self, id: int) -> ProcessRoleHolderDepartmentLinkSchema:
        result = await self.repository.get_by_id(id)
        if not result:
            raise await self._resolve_domain_error(
                ProcessRoleHolderDepartmentNotFound(id)
            )
        return result

    async def get_department_ids(
        self,
        holder_employee_id: int,
        process_key: str,
        role_key: str,
    ) -> set[int]:
        """Resolver: department instances `holder_employee_id` supervises for a
        given process+role. Used to scope people-review visibility to a subtree."""
        return await self.repository.get_department_ids(
            holder_employee_id, process_key, role_key
        )

    async def get_links(
        self,
        process_role_holder_id: int | None = None,
        process_role_id: int | None = None,
        department_id: int | None = None,
        sort: str | None = None,
    ) -> list[ProcessRoleHolderDepartmentLinkSchema]:
        filters = {}
        if process_role_holder_id is not None:
            filters["process_role_holder_id"] = process_role_holder_id
        if process_role_id is not None:
            filters["process_role_id"] = process_role_id
        if department_id is not None:
            filters["department_id"] = department_id
        records = await self.get_all(params=filters or None, sort_json=sort)
        return [
            ProcessRoleHolderDepartmentLinkSchema.model_validate(r) for r in records
        ]

    async def create_link(
        self, link_in: ProcessRoleHolderDepartmentLinkCreate
    ) -> MutationResponse[ProcessRoleHolderDepartmentLinkSchema]:
        holder = await self.holder_repository.get_by_id(link_in.process_role_holder_id)
        if not holder:
            raise await self._resolve_domain_error(
                ProcessRoleHolderNotFound(link_in.process_role_holder_id)
            )
        data = link_in.model_dump()
        data["process_role_id"] = holder.process_role_id  # from holder, never client
        try:
            record = await self.create_from_dict(data)
            fresh = await self.repository.get_by_id(record.id)
            schema = ProcessRoleHolderDepartmentLinkSchema.model_validate(fresh)
            label = schema.department_name or str(schema.department_id)
            detail = await self._resolve_domain_success(
                ProcessRoleHolderDepartmentCreateSuccess(label)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                ProcessRoleHolderDepartmentExists(str(link_in.department_id))
            )

    async def delete_link(self, link_id: int) -> None:
        record = await self.get_by_id(link_id)
        label = record.department_name or str(record.department_id)
        await self.delete_by_id(
            link_id,
            name=label,
            delete_error_exc=ProcessRoleHolderDepartmentDeleteError,
            delete_success_exc=ProcessRoleHolderDepartmentDeleteSuccess,
        )
