from typing import Optional, List

from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.review_level_requirement.review_level_requirement_repository import (
    ReviewLevelRequirementRepository,
)
from backend.api_v1.review_level_requirement.review_level_requirement_schema import (
    ReviewLevelRequirement as ReviewLevelRequirementSchema,
    ReviewLevelRequirementCreate,
    ReviewLevelRequirementUpdate,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.review_level_requirement.review_level_requirement_errors import (
    ReviewLevelRequirementNotFound,
    ReviewLevelRequirementDeleteError,
)
from backend.api_v1.review_level_requirement.review_level_requirement_success import (
    ReviewLevelRequirementDeleteSuccess,
    ReviewLevelRequirementCreateSuccess,
    ReviewLevelRequirementUpdateSuccess,
)


class ReviewLevelRequirementService(BaseService):
    def __init__(
        self,
        repository: ReviewLevelRequirementRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def get_by_id(self, id: int):
        result = await self.repository.get_by_id(id)
        if not result:
            exc = ReviewLevelRequirementNotFound(id)
            raise await self._resolve_domain_error(exc)
        return result

    async def get_requirements(
        self,
        level_id: Optional[int] = None,
        is_active: Optional[bool] = None,
        sort: Optional[str] = None,
    ) -> List[ReviewLevelRequirementSchema]:
        filters = {}
        if level_id is not None:
            filters["level_id"] = level_id
        if is_active is not None:
            filters["is_active"] = is_active
        records = await self.get_all(params=filters or None, sort_json=sort)
        return [ReviewLevelRequirementSchema.model_validate(r) for r in records]

    async def create_requirement(
        self, req_in: ReviewLevelRequirementCreate
    ) -> MutationResponse[ReviewLevelRequirementSchema]:
        record = await self.create(req_in)
        schema = ReviewLevelRequirementSchema.model_validate(record)
        detail = await self._resolve_domain_success(
            ReviewLevelRequirementCreateSuccess(str(schema.id))
        )
        return MutationResponse(detail=detail, data=schema)

    async def update_requirement(
        self, req_id: int, req_update: ReviewLevelRequirementUpdate
    ) -> MutationResponse[ReviewLevelRequirementSchema]:
        orm_record = await self.get_by_id(req_id)
        updated = await self.update(orm_record, req_update, partial=True)
        schema = ReviewLevelRequirementSchema.model_validate(updated)
        detail = await self._resolve_domain_success(
            ReviewLevelRequirementUpdateSuccess(str(schema.id))
        )
        return MutationResponse(detail=detail, data=schema)

    async def delete_requirement(self, req_id: int) -> None:
        record = await self.get_by_id(req_id)
        await self.delete_by_id(
            req_id,
            name=str(record.id),
            delete_error_exc=ReviewLevelRequirementDeleteError,
            delete_success_exc=ReviewLevelRequirementDeleteSuccess,
        )
