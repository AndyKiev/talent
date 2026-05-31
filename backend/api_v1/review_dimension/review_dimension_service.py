from typing import Optional, List

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.review_dimension.review_dimension_repository import (
    ReviewDimensionRepository,
)
from backend.api_v1.review_dimension.review_dimension_schema import (
    ReviewDimension as ReviewDimensionSchema,
    ReviewDimensionCreate,
    ReviewDimensionUpdate,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.review_dimension.review_dimension_errors import (
    ReviewDimensionNotFound,
    ReviewDimensionNameTaken,
    ReviewDimensionDeleteError,
    ReviewDimensionNotFoundByName,
)
from backend.api_v1.review_dimension.review_dimension_success import (
    ReviewDimensionDeleteSuccess,
    ReviewDimensionCreateSuccess,
    ReviewDimensionUpdateSuccess,
)


class ReviewDimensionService(BaseService):
    def __init__(
        self,
        repository: ReviewDimensionRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def get_by_id(self, id: int):
        result = await self.repository.get_by_id(id)
        if not result:
            exc = ReviewDimensionNotFound(id)
            raise await self._resolve_domain_error(exc)
        return result

    async def get_review_dimensions(
        self,
        name: Optional[str] = None,
        is_active: Optional[bool] = None,
        sort: Optional[str] = None,
    ) -> List[ReviewDimensionSchema]:
        if name:
            record = await self.get_by_name(
                name, not_found_exc=ReviewDimensionNotFoundByName
            )
            return [ReviewDimensionSchema.model_validate(record)]
        filters = {}
        if is_active is not None:
            filters["is_active"] = is_active
        records = await self.get_all(params=filters or None, sort_json=sort)
        return [ReviewDimensionSchema.model_validate(r) for r in records]

    async def create_review_dimension(
        self, dim_in: ReviewDimensionCreate
    ) -> MutationResponse[ReviewDimensionSchema]:
        await self.exists_by_name(
            dim_in.name, already_exists_exc=ReviewDimensionNameTaken
        )
        try:
            record = await self.create(dim_in)
            schema = ReviewDimensionSchema.model_validate(record)
            detail = await self._resolve_domain_success(
                ReviewDimensionCreateSuccess(schema.name)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                ReviewDimensionNameTaken(dim_in.name)
            )

    async def update_review_dimension(
        self, dim_id: int, dim_update: ReviewDimensionUpdate
    ) -> MutationResponse[ReviewDimensionSchema]:
        if dim_update.name:
            await self.exists_by_name_excluding(
                dim_update.name,
                exclude_ids=[dim_id],
                already_exists_exc=ReviewDimensionNameTaken,
            )
        try:
            orm_record = await self.get_by_id(dim_id)
            updated = await self.update(orm_record, dim_update, partial=True)
            schema = ReviewDimensionSchema.model_validate(updated)
            detail = await self._resolve_domain_success(
                ReviewDimensionUpdateSuccess(schema.name)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                ReviewDimensionNameTaken(dim_update.name)
            )

    async def delete_review_dimension(self, dim_id: int) -> None:
        record = await self.get_by_id(dim_id)
        await self.delete_by_id(
            dim_id,
            name=record.name,
            delete_error_exc=ReviewDimensionDeleteError,
            delete_success_exc=ReviewDimensionDeleteSuccess,
        )
