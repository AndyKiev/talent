from typing import Optional, List

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.review_session_status.review_session_status_repository import (
    ReviewSessionStatusRepository,
)
from backend.api_v1.review_session_status.review_session_status_schema import (
    ReviewSessionStatus as ReviewSessionStatusSchema,
    ReviewSessionStatusCreate,
    ReviewSessionStatusUpdate,
)
from backend.api_v1.review_session_status.review_session_status_messages import (
    ReviewSessionStatusNotFound,
    ReviewSessionStatusNotFoundByKey,
    ReviewSessionStatusKeyTaken,
    ReviewSessionStatusDeleteError,
)
from backend.api_v1.review_session_status.review_session_status_messages import (
    ReviewSessionStatusDeleteSuccess,
    ReviewSessionStatusCreateSuccess,
    ReviewSessionStatusUpdateSuccess,
)


class ReviewSessionStatusService(BaseService):
    def __init__(
        self,
        repository: ReviewSessionStatusRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def get_by_id(self, id: int) -> ReviewSessionStatusSchema:
        result = await self.repository.get_by_id(id)
        if not result:
            raise await self._resolve_domain_error(ReviewSessionStatusNotFound(id))
        return result

    async def get_id_by_key(self, key: str) -> int:
        """Resolve a status id from its stable key (no magic numbers)."""
        status_id = await self.repository.get_id_by_field("key", key)
        if status_id is None:
            raise await self._resolve_domain_error(ReviewSessionStatusNotFoundByKey(key))
        return status_id

    async def get_review_session_statuses(
        self,
        sort: Optional[str] = None,
    ) -> List[ReviewSessionStatusSchema]:
        records = await self.get_all(sort_json=sort)
        return [ReviewSessionStatusSchema.model_validate(r) for r in records]

    async def create_review_session_status(
        self, status_in: ReviewSessionStatusCreate
    ) -> MutationResponse[ReviewSessionStatusSchema]:
        existing = await self.repository.get_by_field("key", status_in.key)
        if existing:
            raise await self._resolve_domain_error(
                ReviewSessionStatusKeyTaken(status_in.key)
            )
        try:
            record = await self.create(status_in)
            schema = ReviewSessionStatusSchema.model_validate(record)
            detail = await self._resolve_domain_success(
                ReviewSessionStatusCreateSuccess(schema.name)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                ReviewSessionStatusKeyTaken(status_in.key)
            )

    async def update_review_session_status(
        self, status_id: int, status_update: ReviewSessionStatusUpdate
    ) -> MutationResponse[ReviewSessionStatusSchema]:
        if status_update.key:
            await self.exists_by_field_excluding(
                field_name="key",
                value=status_update.key,
                exclude_ids=[status_id],
                already_exists_exc=ReviewSessionStatusKeyTaken,
            )
        try:
            orm_record = await self.get_by_id(status_id)
            updated = await self.update(orm_record, status_update, partial=True)
            schema = ReviewSessionStatusSchema.model_validate(updated)
            detail = await self._resolve_domain_success(
                ReviewSessionStatusUpdateSuccess(schema.name)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                ReviewSessionStatusKeyTaken(status_update.key)
            )

    async def delete_review_session_status(self, status_id: int) -> None:
        record = await self.get_by_id(status_id)
        await self.delete_by_id(
            status_id,
            name=record.name,
            delete_error_exc=ReviewSessionStatusDeleteError,
            delete_success_exc=ReviewSessionStatusDeleteSuccess,
        )
