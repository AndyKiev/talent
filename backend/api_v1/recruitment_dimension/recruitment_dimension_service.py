import re
from typing import Optional, List

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.recruitment_dimension.recruitment_dimension_repository import (
    RecruitmentDimensionRepository,
)
from backend.api_v1.recruitment_dimension.recruitment_dimension_schema import (
    RecruitmentDimension as RecruitmentDimensionSchema,
    RecruitmentDimensionCreate,
    RecruitmentDimensionUpdate,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.recruitment_dimension.recruitment_dimension_messages import (
    RecruitmentDimensionNotFound,
    RecruitmentDimensionNameTaken,
    RecruitmentDimensionDeleteError,
    RecruitmentDimensionNotFoundByName,
    RecruitmentDimensionInvalidColor,
)
from backend.api_v1.recruitment_dimension.recruitment_dimension_messages import (
    RecruitmentDimensionDeleteSuccess,
    RecruitmentDimensionCreateSuccess,
    RecruitmentDimensionUpdateSuccess,
)


class RecruitmentDimensionService(BaseService):
    def __init__(
        self,
        repository: RecruitmentDimensionRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    # A 6-digit hex color (e.g. #2E7D32) — matches the picker output + DB column.
    _HEX_COLOR_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")

    async def _validate_color(self, color: Optional[str]) -> None:
        if color is not None and not self._HEX_COLOR_RE.match(color):
            raise await self._resolve_domain_error(
                RecruitmentDimensionInvalidColor(color)
            )

    async def get_by_id(self, id: int):
        result = await self.repository.get_by_id(id)
        if not result:
            exc = RecruitmentDimensionNotFound(id)
            raise await self._resolve_domain_error(exc)
        return result

    async def get_recruitment_dimensions(
        self,
        name: Optional[str] = None,
        is_active: Optional[bool] = None,
        sort: Optional[str] = None,
    ) -> List[RecruitmentDimensionSchema]:
        if name:
            record = await self.get_by_name(
                name, not_found_exc=RecruitmentDimensionNotFoundByName
            )
            return [RecruitmentDimensionSchema.model_validate(record)]
        filters = {}
        if is_active is not None:
            filters["is_active"] = is_active
        # Default to the admin-defined display order (sort_order, then id as
        # tiebreak) so every list shares one order unless caller overrides.
        records = await self.get_all(
            params=filters or None,
            sort_json=sort,
            sort=None if sort else ["sort_order", "id"],
        )
        return [RecruitmentDimensionSchema.model_validate(r) for r in records]

    async def create_recruitment_dimension(
        self, dim_in: RecruitmentDimensionCreate
    ) -> MutationResponse[RecruitmentDimensionSchema]:
        await self._validate_color(dim_in.color)
        await self.exists_by_name(
            dim_in.name, already_exists_exc=RecruitmentDimensionNameTaken
        )
        try:
            record = await self.create(dim_in)
            schema = RecruitmentDimensionSchema.model_validate(record)
            detail = await self._resolve_domain_success(
                RecruitmentDimensionCreateSuccess(schema.name)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                RecruitmentDimensionNameTaken(dim_in.name)
            )

    async def update_recruitment_dimension(
        self, dim_id: int, dim_update: RecruitmentDimensionUpdate
    ) -> MutationResponse[RecruitmentDimensionSchema]:
        await self._validate_color(dim_update.color)
        if dim_update.name:
            await self.exists_by_name_excluding(
                dim_update.name,
                exclude_ids=[dim_id],
                already_exists_exc=RecruitmentDimensionNameTaken,
            )
        try:
            orm_record = await self.get_by_id(dim_id)
            updated = await self.update(orm_record, dim_update, partial=True)
            schema = RecruitmentDimensionSchema.model_validate(updated)
            detail = await self._resolve_domain_success(
                RecruitmentDimensionUpdateSuccess(schema.name)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                RecruitmentDimensionNameTaken(dim_update.name)
            )

    async def delete_recruitment_dimension(self, dim_id: int) -> None:
        record = await self.get_by_id(dim_id)
        await self.delete_by_id(
            dim_id,
            name=record.name,
            delete_error_exc=RecruitmentDimensionDeleteError,
            delete_success_exc=RecruitmentDimensionDeleteSuccess,
        )
