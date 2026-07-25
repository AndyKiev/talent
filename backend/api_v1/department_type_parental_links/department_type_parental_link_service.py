
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.department_type_parental_links.department_type_parental_link_messages import (
    DepartmentTypeParentalLinkAlreadyExists,
    DepartmentTypeParentalLinkCreateSuccess,
    DepartmentTypeParentalLinkDeleteError,
    DepartmentTypeParentalLinkDeleteSuccess,
    DepartmentTypeParentalLinkNotFound,
    DepartmentTypeParentalLinkUpdateSuccess,
)
from backend.api_v1.department_type_parental_links.department_type_parental_link_repository import (
    DepartmentTypeParentalLinkRepository,
)
from backend.api_v1.department_type_parental_links.department_type_parental_link_schema import (
    DepartmentTypeParentalLink as DepartmentTypeParentalLinkSchema,
)
from backend.api_v1.department_type_parental_links.department_type_parental_link_schema import (
    DepartmentTypeParentalLinkCreate,
    DepartmentTypeParentalLinkUpdate,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema


class DepartmentTypeParentalLinkService(BaseService):
    def __init__(
        self,
        repository: DepartmentTypeParentalLinkRepository,
        user: EmployeeSchema | None = None,
        session: AsyncSession | None = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def get_by_id(self, id: int) -> DepartmentTypeParentalLinkSchema:
        result = await self.repository.get_by_id(id)
        if not result:
            raise await self._resolve_domain_error(
                DepartmentTypeParentalLinkNotFound(id)
            )
        return result

    async def get_child_map(self) -> dict[int, list[int]]:
        """{parent_type_id: [child_type_id, ...]} from ACTIVE links — lets the
        frontend department tree resolve allowed types for every node with ONE
        request instead of one per parent type."""
        return await self.repository.get_active_child_map()

    async def get_links(
        self,
        child_id: int | None = None,
        parent_id: int | None = None,
        is_active: bool | None = None,
        sort: str | None = None,
    ) -> list[DepartmentTypeParentalLinkSchema]:
        filters = {}
        if child_id is not None:
            filters["child_id"] = child_id
        if parent_id is not None:
            filters["parent_id"] = parent_id
        if is_active is not None:
            filters["is_active"] = is_active
        records = await self.get_all(params=filters or None, sort_json=sort)
        return [DepartmentTypeParentalLinkSchema.model_validate(r) for r in records]

    async def create_link(
        self, link_in: DepartmentTypeParentalLinkCreate
    ) -> MutationResponse[DepartmentTypeParentalLinkSchema]:
        try:
            # Call base service create method
            record = await self.create(link_in)
            schema = DepartmentTypeParentalLinkSchema.model_validate(record)
            link_name = f"{schema.child_id}-{schema.parent_id}"
            detail = await self._resolve_domain_success(
                DepartmentTypeParentalLinkCreateSuccess(link_name)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                DepartmentTypeParentalLinkAlreadyExists(
                    link_in.child_id, link_in.parent_id
                )
            )

    async def update_link(
        self, link_id: int, link_update: DepartmentTypeParentalLinkUpdate
    ) -> MutationResponse[DepartmentTypeParentalLinkSchema]:
        # Get existing record first (for name formatting and conflict check)
        record = await self.get_by_id(link_id)
        try:
            # Call base service update method
            updated = await self.update(record, link_update, partial=True)
            schema = DepartmentTypeParentalLinkSchema.model_validate(updated)
            link_name = f"{schema.child_id}-{schema.parent_id}"
            detail = await self._resolve_domain_success(
                DepartmentTypeParentalLinkUpdateSuccess(link_name)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                DepartmentTypeParentalLinkAlreadyExists(
                    link_update.child_id or record.child_id,
                    link_update.parent_id or record.parent_id,
                )
            )

    async def delete_link(self, link_id: int) -> None:
        record = await self.get_by_id(link_id)
        link_name = (
            f"{record.child_id}-{record.parent_id}"  # Format name BEFORE deletion
        )
        await self.delete_by_id(
            link_id,
            name=link_name,  # Pass formatted name
            delete_error_exc=DepartmentTypeParentalLinkDeleteError,
            delete_success_exc=DepartmentTypeParentalLinkDeleteSuccess,
        )
