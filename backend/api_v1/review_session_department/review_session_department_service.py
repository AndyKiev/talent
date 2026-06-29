from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.review_session_department.review_session_department_repository import (
    ReviewSessionDepartmentRepository,
)
from backend.api_v1.review_session_department.review_session_department_schema import (
    ReviewSessionDepartment as ReviewSessionDepartmentSchema,
    ReviewSessionDepartmentCreate,
)
from backend.api_v1.review_session_department.review_session_department_errors import (
    ReviewSessionDepartmentNotFound,
    ReviewSessionDepartmentAlreadyExists,
)
from backend.api_v1.review_session_department.review_session_department_success import (
    ReviewSessionDepartmentCreateSuccess,
    ReviewSessionDepartmentDeleteSuccess,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema


class ReviewSessionDepartmentService(BaseService):
    def __init__(
        self,
        repository: ReviewSessionDepartmentRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def link_department(
        self, session_id: int, dep_in: ReviewSessionDepartmentCreate
    ) -> MutationResponse[ReviewSessionDepartmentSchema]:
        existing = await self.repository.get_by_session_and_department(
            session_id, dep_in.department_id
        )
        if existing:
            raise await self._resolve_domain_error(
                ReviewSessionDepartmentAlreadyExists(session_id, dep_in.department_id)
            )

        record = await self.create_from_dict(
            {"session_id": session_id, "department_id": dep_in.department_id}
        )
        # Re-fetch to get department name
        record = await self.repository.get_by_id(record.id)
        schema = ReviewSessionDepartmentSchema.from_orm_with_name(record)
        detail = await self._resolve_domain_success(
            ReviewSessionDepartmentCreateSuccess(session_id, dep_in.department_id)
        )
        return MutationResponse(detail=detail, data=schema)

    async def get_departments_for_session(
        self, session_id: int
    ) -> List[ReviewSessionDepartmentSchema]:
        records = await self.repository.get_by_session(session_id)
        return [ReviewSessionDepartmentSchema.from_orm_with_name(r) for r in records]

    async def unlink_department(self, rsd_id: int) -> MutationResponse[None]:
        record = await self.repository.get_by_id(rsd_id)
        if not record:
            raise await self._resolve_domain_error(
                ReviewSessionDepartmentNotFound(rsd_id)
            )
        await self.repository.delete(record.id)
        detail = await self._resolve_domain_success(
            ReviewSessionDepartmentDeleteSuccess()
        )
        return MutationResponse(detail=detail, data=None)

    async def get_department_ids_for_session(self, session_id: int) -> set[int]:
        """Return the set of department_ids linked to a session."""
        records = await self.repository.get_by_session(session_id)
        return {r.department_id for r in records}
