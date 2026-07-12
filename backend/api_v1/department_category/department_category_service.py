from typing import Optional, List

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.department_category.department_category_repository import (
    DepartmentCategoryRepository,
)
from backend.api_v1.department_category.department_category_schema import (
    DepartmentCategory as DepartmentCategorySchema,
    DepartmentCategoryCreate,
    DepartmentCategoryUpdate,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.department_category.department_category_messages import (
    DepartmentCategoryNotFound,
    DepartmentCategoryNameTaken,
    DepartmentCategoryDeleteError,
    DepartmentCategoryNotFoundByName,
)
from backend.api_v1.department_category.department_category_messages import (
    DepartmentCategoryDeleteSuccess,
    DepartmentCategoryCreateSuccess,
    DepartmentCategoryUpdateSuccess,
)


class DepartmentCategoryService(BaseService):
    def __init__(
        self,
        repository: DepartmentCategoryRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def get_by_id(self, id: int) -> DepartmentCategorySchema:
        result = await self.repository.get_by_id(id)
        if not result:
            raise await self._resolve_domain_error(DepartmentCategoryNotFound(id))
        return result

    async def get_department_categories(
        self,
        name: Optional[str] = None,
        is_active: Optional[bool] = None,
        is_main: Optional[bool] = None,
        is_responsibility: Optional[bool] = None,
        sort: Optional[str] = None,
    ) -> List[DepartmentCategorySchema]:
        if name:
            record = await self.get_by_name(
                name, not_found_exc=DepartmentCategoryNotFoundByName
            )
            return [DepartmentCategorySchema.model_validate(record)]
        filters = {}
        if is_active is not None:
            filters["is_active"] = is_active
        if is_main is not None:
            filters["is_main"] = is_main
        if is_responsibility is not None:
            filters["is_responsibility"] = is_responsibility
        records = await self.get_all(params=filters or None, sort_json=sort)
        return [DepartmentCategorySchema.model_validate(r) for r in records]

    async def create_department_category(
        self, category_in: DepartmentCategoryCreate
    ) -> MutationResponse[DepartmentCategorySchema]:
        await self.exists_by_name(
            category_in.name, already_exists_exc=DepartmentCategoryNameTaken
        )
        try:
            record = await self.create(category_in)
            schema = DepartmentCategorySchema.model_validate(record)
            detail = await self._resolve_domain_success(
                DepartmentCategoryCreateSuccess(schema.name)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                DepartmentCategoryNameTaken(category_in.name)
            )

    async def update_department_category(
        self, category_id: int, category_update: DepartmentCategoryUpdate
    ) -> MutationResponse[DepartmentCategorySchema]:
        if category_update.name:
            await self.exists_by_name(
                category_update.name, already_exists_exc=DepartmentCategoryNameTaken
            )
        try:
            orm_record = await self.get_by_id(category_id)
            updated = await self.update(orm_record, category_update, partial=True)
            schema = DepartmentCategorySchema.model_validate(updated)
            detail = await self._resolve_domain_success(
                DepartmentCategoryUpdateSuccess(schema.name)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                DepartmentCategoryNameTaken(category_update.name)
            )

    async def delete_department_category(self, category_id: int) -> None:
        record = await self.get_by_id(category_id)
        await self.delete_by_id(
            category_id,
            name=record.name,
            delete_error_exc=DepartmentCategoryDeleteError,
            delete_success_exc=DepartmentCategoryDeleteSuccess,
        )
