from typing import Optional, List

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.review_dimension_criteria.review_dimension_criteria_repository import (
    ReviewDimensionCriteriaRepository,
)
from backend.api_v1.review_dimension_criteria.review_dimension_criteria_schema import (
    ReviewDimensionCriteria as ReviewDimensionCriteriaSchema,
    ReviewDimensionCriteriaCreate,
    ReviewDimensionCriteriaUpdate,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.review_dimension_criteria.review_dimension_criteria_messages import (
    ReviewDimensionCriteriaNotFound,
    ReviewDimensionCriteriaDeleteError,
)
from backend.api_v1.review_dimension_criteria.review_dimension_criteria_messages import (
    ReviewDimensionCriteriaDeleteSuccess,
    ReviewDimensionCriteriaCreateSuccess,
    ReviewDimensionCriteriaUpdateSuccess,
)


class ReviewDimensionCriteriaService(BaseService):
    def __init__(
        self,
        repository: ReviewDimensionCriteriaRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def get_by_id(self, id: int):
        result = await self.repository.get_by_id(id)
        if not result:
            exc = ReviewDimensionCriteriaNotFound(id)
            raise await self._resolve_domain_error(exc)
        return result

    async def get_criteria(
        self,
        dimension_id: Optional[int] = None,
        sort: Optional[str] = None,
    ) -> List[ReviewDimensionCriteriaSchema]:
        filters = {}
        if dimension_id is not None:
            filters["dimension_id"] = dimension_id
        records = await self.get_all(params=filters or None, sort_json=sort)
        return [ReviewDimensionCriteriaSchema.model_validate(r) for r in records]

    async def create_criteria(
        self, crit_in: ReviewDimensionCriteriaCreate
    ) -> MutationResponse[ReviewDimensionCriteriaSchema]:
        record = await self.create(crit_in)
        schema = ReviewDimensionCriteriaSchema.model_validate(record)
        detail = await self._resolve_domain_success(
            ReviewDimensionCriteriaCreateSuccess(str(schema.id))
        )
        return MutationResponse(detail=detail, data=schema)

    async def update_criteria(
        self, crit_id: int, crit_update: ReviewDimensionCriteriaUpdate
    ) -> MutationResponse[ReviewDimensionCriteriaSchema]:
        orm_record = await self.get_by_id(crit_id)
        updated = await self.update(orm_record, crit_update, partial=True)
        schema = ReviewDimensionCriteriaSchema.model_validate(updated)
        detail = await self._resolve_domain_success(
            ReviewDimensionCriteriaUpdateSuccess(str(schema.id))
        )
        return MutationResponse(detail=detail, data=schema)

    async def delete_criteria(self, crit_id: int) -> None:
        record = await self.get_by_id(crit_id)
        await self.delete_by_id(
            crit_id,
            name=str(record.id),
            delete_error_exc=ReviewDimensionCriteriaDeleteError,
            delete_success_exc=ReviewDimensionCriteriaDeleteSuccess,
        )
