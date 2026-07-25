import re

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.review_dimension.review_dimension_messages import (
    ReviewDimensionCreateSuccess,
    ReviewDimensionDeleteError,
    ReviewDimensionDeleteSuccess,
    ReviewDimensionInvalidColor,
    ReviewDimensionNameTaken,
    ReviewDimensionNotFound,
    ReviewDimensionNotFoundByName,
    ReviewDimensionUpdateSuccess,
)
from backend.api_v1.review_dimension.review_dimension_repository import (
    ReviewDimensionRepository,
)
from backend.api_v1.review_dimension.review_dimension_schema import (
    ReviewDimension as ReviewDimensionSchema,
)
from backend.api_v1.review_dimension.review_dimension_schema import (
    ReviewDimensionCreate,
    ReviewDimensionUpdate,
)


class ReviewDimensionService(BaseService):
    def __init__(
        self,
        repository: ReviewDimensionRepository,
        user: EmployeeSchema | None = None,
        session: AsyncSession | None = None,
    ):
        super().__init__(repository, user=user, session=session)

    # A 6-digit hex color (e.g. #2E7D32) — matches the picker output + DB column.
    _HEX_COLOR_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")

    async def _validate_color(self, color: str | None) -> None:
        if color is not None and not self._HEX_COLOR_RE.match(color):
            raise await self._resolve_domain_error(ReviewDimensionInvalidColor(color))

    async def get_by_id(self, id: int):
        result = await self.repository.get_by_id(id)
        if not result:
            exc = ReviewDimensionNotFound(id)
            raise await self._resolve_domain_error(exc)
        return result

    async def get_review_dimensions(
        self,
        name: str | None = None,
        is_active: bool | None = None,
        sort: str | None = None,
    ) -> list[ReviewDimensionSchema]:
        if name:
            record = await self.get_by_name(
                name, not_found_exc=ReviewDimensionNotFoundByName
            )
            return [ReviewDimensionSchema.model_validate(record)]
        filters = {}
        if is_active is not None:
            filters["is_active"] = is_active
        # Default to the admin-defined display order (sort_order, then id as
        # tiebreak) so every list/PDF shares one order unless caller overrides.
        records = await self.get_all(
            params=filters or None,
            sort_json=sort,
            sort=None if sort else ["sort_order", "id"],
        )
        return [ReviewDimensionSchema.model_validate(r) for r in records]

    async def create_review_dimension(
        self, dim_in: ReviewDimensionCreate
    ) -> MutationResponse[ReviewDimensionSchema]:
        await self._validate_color(dim_in.color)
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
        await self._validate_color(dim_update.color)
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
