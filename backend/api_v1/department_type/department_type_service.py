from typing import Optional, List

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.department_type.department_type_repository import (
    DepartmentTypeRepository,
)
from backend.api_v1.department_type.department_type_schema import (
    DepartmentType as DepartmentTypeSchema,
    DepartmentTypeCreate,
    DepartmentTypeUpdate,
    DepartmentTypeWithParentalLink,
    DepartmentTypeWithLinkStats,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.department_type.department_type_errors import (
    DepartmentTypeNotFound,
    DepartmentTypeNameTaken,
    DepartmentTypeDeleteError,
    DepartmentTypeNotFoundByName,
)
from backend.api_v1.department_type.department_type_success import (
    DepartmentTypeDeleteSuccess,
    DepartmentTypeCreateSuccess,
    DepartmentTypeUpdateSuccess,
)


class DepartmentTypeService(BaseService):
    def __init__(
        self,
        repository: DepartmentTypeRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def get_by_id(self, id: int) -> DepartmentTypeSchema:
        result = await self.repository.get_by_id(id)
        if not result:
            raise await self._resolve_domain_error(DepartmentTypeNotFound(id))
        return result

    async def get_department_types(
        self,
        name: Optional[str] = None,
        is_active: Optional[bool] = None,
        sort: Optional[str] = None,
    ) -> List[DepartmentTypeWithLinkStats]:
        if name:
            record = await self.get_by_name(
                name, not_found_exc=DepartmentTypeNotFoundByName
            )
            data = DepartmentTypeSchema.model_validate(record).model_dump()
            return [DepartmentTypeWithLinkStats(**data)]

        rows = await self.repository.get_with_link_stats(is_active=is_active)
        enriched: List[DepartmentTypeWithLinkStats] = []
        for record, parent_names, job_count in rows:
            data = DepartmentTypeSchema.model_validate(record).model_dump()
            data["parent_names"] = parent_names
            data["job_count"] = job_count
            enriched.append(DepartmentTypeWithLinkStats(**data))
        return enriched

    async def create_department_type(
        self, type_in: DepartmentTypeCreate
    ) -> MutationResponse[DepartmentTypeSchema]:
        await self.exists_by_name(
            type_in.name, already_exists_exc=DepartmentTypeNameTaken
        )
        try:
            record = await self.create(type_in)
            schema = DepartmentTypeSchema.model_validate(record)
            detail = await self._resolve_domain_success(
                DepartmentTypeCreateSuccess(schema.name)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                DepartmentTypeNameTaken(type_in.name)
            )

    async def update_department_type(
        self, type_id: int, type_update: DepartmentTypeUpdate
    ) -> MutationResponse[DepartmentTypeSchema]:
        if type_update.name:
            await self.exists_by_name(
                type_update.name, already_exists_exc=DepartmentTypeNameTaken
            )
        try:
            orm_record = await self.get_by_id(type_id)
            updated = await self.update(orm_record, type_update, partial=True)
            schema = DepartmentTypeSchema.model_validate(updated)
            detail = await self._resolve_domain_success(
                DepartmentTypeUpdateSuccess(schema.name)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                DepartmentTypeNameTaken(type_update.name)
            )

    async def delete_department_type(self, type_id: int) -> None:
        record = await self.get_by_id(type_id)
        await self.delete_by_id(
            type_id,
            name=record.name,
            delete_error_exc=DepartmentTypeDeleteError,
            delete_success_exc=DepartmentTypeDeleteSuccess,
        )

    async def get_children_by_parent(
        self,
        parent_id: int,
        is_active: Optional[bool] = None,
        sort: Optional[str] = None,
    ) -> List[DepartmentTypeWithParentalLink]:
        """
        Get all child department types for a given parent, including
        link_id, link_is_active, and parent_id in the response.
        Both active and inactive links are returned; callers may filter via is_active.
        """
        from sqlalchemy import select
        from backend.api_v1.department_type_parental_links.department_type_parental_link_model import (
            DepartmentTypeParentalLink,
        )

        stmt = (
            select(
                self.repository.model,
                DepartmentTypeParentalLink.id.label("link_id"),
                DepartmentTypeParentalLink.is_active.label("link_is_active"),
            )
            .join(
                DepartmentTypeParentalLink,
                self.repository.model.id == DepartmentTypeParentalLink.child_id,
            )
            .where(DepartmentTypeParentalLink.parent_id == parent_id)
        )

        # Optional filter on the department type's own is_active
        if is_active is not None:
            stmt = stmt.where(self.repository.model.is_active == is_active)

        if sort:
            from backend.api_v1.base.models.utils.mixins import parse_sort_json

            sort_params = parse_sort_json(sort)
            for field, direction in sort_params.items():
                if hasattr(self.repository.model, field):
                    col = getattr(self.repository.model, field)
                    stmt = stmt.order_by(
                        col.desc() if direction == "desc" else col.asc()
                    )

        result = await self.session.execute(stmt)
        rows = result.all()  # List of tuples: (DepartmentType, link_id, link_is_active)

        enriched = []
        for record, link_id, link_is_active in rows:
            data = DepartmentTypeSchema.model_validate(record).model_dump()
            data["parent_id"] = parent_id
            data["link_id"] = link_id
            data["link_is_active"] = link_is_active
            enriched.append(DepartmentTypeWithParentalLink(**data))

        return enriched
