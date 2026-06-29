from typing import Optional, List

from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.review_level.review_level_repository import ReviewLevelRepository
from backend.api_v1.review_level.review_level_schema import (
    ReviewLevel as ReviewLevelSchema,
    ReviewLevelCreate,
    ReviewLevelUpdate,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.review_level.review_level_errors import (
    ReviewLevelNotFound,
    ReviewLevelDeleteError,
)
from backend.api_v1.review_level.review_level_success import (
    ReviewLevelDeleteSuccess,
    ReviewLevelCreateSuccess,
    ReviewLevelUpdateSuccess,
)


class ReviewLevelService(BaseService):
    def __init__(
        self,
        repository: ReviewLevelRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def get_by_id(self, id: int):
        result = await self.repository.get_by_id(id)
        if not result:
            exc = ReviewLevelNotFound(id)
            raise await self._resolve_domain_error(exc)
        return result

    async def get_levels(
        self,
        is_active: Optional[bool] = None,
        sort: Optional[str] = None,
    ) -> List[ReviewLevelSchema]:
        filters = {}
        if is_active is not None:
            filters["is_active"] = is_active
        records = await self.get_all(params=filters or None, sort_json=sort)
        return [ReviewLevelSchema.model_validate(r) for r in records]

    async def create_level(
        self, level_in: ReviewLevelCreate
    ) -> MutationResponse[ReviewLevelSchema]:
        from backend.api_v1.msg_full.msg_full_helper import upsert_translations

        # Persist the inline EN/UK text (if supplied) for the name/description keys
        # before creating the row, so the keys resolve to real text.
        entries = {
            level_in.name_key: {"eng": level_in.name_eng, "ukr": level_in.name_ukr}
        }
        if level_in.description_key:
            entries[level_in.description_key] = {
                "eng": level_in.description_eng,
                "ukr": level_in.description_ukr,
            }
        await upsert_translations(self.session, entries)

        record = await self.create_from_dict(
            {
                "name_key": level_in.name_key,
                "description_key": level_in.description_key,
                "sort_order": level_in.sort_order,
                "is_active": level_in.is_active,
            }
        )
        schema = ReviewLevelSchema.model_validate(record)
        detail = await self._resolve_domain_success(
            ReviewLevelCreateSuccess(schema.name_key)
        )
        return MutationResponse(detail=detail, data=schema)

    async def update_level(
        self, level_id: int, level_update: ReviewLevelUpdate
    ) -> MutationResponse[ReviewLevelSchema]:
        orm_record = await self.get_by_id(level_id)
        updated = await self.update(orm_record, level_update, partial=True)
        schema = ReviewLevelSchema.model_validate(updated)
        detail = await self._resolve_domain_success(
            ReviewLevelUpdateSuccess(schema.name_key)
        )
        return MutationResponse(detail=detail, data=schema)

    async def delete_level(self, level_id: int) -> None:
        record = await self.get_by_id(level_id)
        await self.delete_by_id(
            level_id,
            name=record.name_key,
            delete_error_exc=ReviewLevelDeleteError,
            delete_success_exc=ReviewLevelDeleteSuccess,
        )
