from typing import Optional, List

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.job_category.job_category_repository import JobCategoryRepository
from backend.api_v1.job_category.job_category_schema import (
    JobCategory as JobCategorySchema,
    JobCategoryCreate,
    JobCategoryUpdate,
)
from backend.api_v1.job_category.job_category_errors import (
    JobCategoryNotFound,
    JobCategoryKeyTaken,
    JobCategoryDeleteError,
)
from backend.api_v1.job_category.job_category_success import (
    JobCategoryCreateSuccess,
    JobCategoryUpdateSuccess,
    JobCategoryDeleteSuccess,
)


class JobCategoryService(BaseService):
    def __init__(
        self,
        repository: JobCategoryRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def get_by_id(self, id: int) -> JobCategorySchema:
        result = await self.repository.get_by_id(id)
        if not result:
            raise await self._resolve_domain_error(JobCategoryNotFound(id))
        return result

    async def get_job_categories(
        self, sort: Optional[str] = None
    ) -> List[JobCategorySchema]:
        # Default list order is the (hidden) sort_order, id tiebreak — drives the
        # in-grid arrow reorder (fe-sorting1).
        if sort:
            records = await self.get_all(sort_json=sort)
        else:
            records = await self.get_all(sort=["sort_order", "id"])
        return [JobCategorySchema.model_validate(r) for r in records]

    async def create_job_category(
        self, category_in: JobCategoryCreate
    ) -> MutationResponse[JobCategorySchema]:
        existing = await self.repository.get_by_field("key", category_in.key)
        if existing:
            raise await self._resolve_domain_error(JobCategoryKeyTaken(category_in.key))
        try:
            record = await self.create(category_in)
            schema = JobCategorySchema.model_validate(record)
            detail = await self._resolve_domain_success(
                JobCategoryCreateSuccess(schema.key)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(JobCategoryKeyTaken(category_in.key))

    async def update_job_category(
        self, category_id: int, category_update: JobCategoryUpdate
    ) -> MutationResponse[JobCategorySchema]:
        if category_update.key:
            existing = await self.repository.get_by_field("key", category_update.key)
            if existing and existing.id != category_id:
                raise await self._resolve_domain_error(
                    JobCategoryKeyTaken(category_update.key)
                )
        try:
            orm_record = await self.get_by_id(category_id)
            updated = await self.update(orm_record, category_update, partial=True)
            schema = JobCategorySchema.model_validate(updated)
            detail = await self._resolve_domain_success(
                JobCategoryUpdateSuccess(schema.key)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                JobCategoryKeyTaken(category_update.key)
            )

    async def delete_job_category(self, category_id: int) -> None:
        record = await self.get_by_id(category_id)
        await self.delete_by_id(
            category_id,
            name=record.key,
            delete_error_exc=JobCategoryDeleteError,
            delete_success_exc=JobCategoryDeleteSuccess,
        )
