from typing import Optional, List

from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.review_session_employee.review_session_employee_repository import (
    ReviewSessionEmployeeRepository,
)
from backend.api_v1.review_session_employee.review_session_employee_schema import (
    ReviewSessionEmployee as RSESchema,
    ReviewSessionEmployeeList as RSEListSchema,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.review_session_employee.review_session_employee_errors import (
    ReviewSessionEmployeeNotFound,
    ReviewSessionEmployeeStatusError,
)
from backend.api_v1.review_session_employee.review_session_employee_success import (
    ReviewSessionEmployeeStatusChangeSuccess,
)

RSE_VALID_TRANSITIONS = {
    "open": ["reviewed"],
    "reviewed": ["closed"],
    "closed": [],
}

# Revert goes one step backward
RSE_REVERT_TRANSITIONS = {
    "reviewed": "open",
    "closed": "reviewed",
}


class ReviewSessionEmployeeService(BaseService):
    def __init__(
        self,
        repository: ReviewSessionEmployeeRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def get_by_id(self, id: int):
        result = await self.repository.get_by_id(id)
        if not result:
            exc = ReviewSessionEmployeeNotFound(id)
            raise await self._resolve_domain_error(exc)
        return result

    def _to_schema(self, record) -> RSESchema:
        schema = RSESchema.model_validate(record)
        if record.employee:
            schema.employee_name = record.employee.name
            schema.employee_code = record.employee.code
        if record.session:
            schema.session_name = record.session.name
            schema.session_status = record.session.status
        return schema

    def _to_list_schema(self, record) -> RSEListSchema:
        schema = RSEListSchema.model_validate(record)
        if record.employee:
            schema.employee_name = record.employee.name
            schema.employee_code = record.employee.code
        evals = getattr(record, "evaluations", []) or []
        schema.scored_count = sum(1 for e in evals if e.score is not None and e.score > 0)
        schema.total_dimensions = len(evals)
        return schema

    async def get_session_employees(
        self,
        session_id: int,
        status: Optional[str] = None,
        sort: Optional[str] = None,
    ) -> List[RSEListSchema]:
        filters = {"session_id": session_id}
        if status:
            filters["status"] = status
        records = await self.get_all(params=filters, sort_json=sort)
        return [self._to_list_schema(r) for r in records]

    async def get_my_reviews(
        self,
        employee_id: int,
    ) -> List[RSEListSchema]:
        filters = {"employee_id": employee_id}
        records = await self.get_all(params=filters)
        return [
            self._to_list_schema(r)
            for r in records
            if r.session and r.session.status == "open" and r.status == "open"
        ]

    async def get_rse_detail(self, rse_id: int) -> RSESchema:
        record = await self.get_by_id(rse_id)
        return self._to_schema(record)

    async def change_status(
        self, rse_id: int, target_status: str
    ) -> MutationResponse[RSESchema]:
        record = await self.get_by_id(rse_id)
        valid = RSE_VALID_TRANSITIONS.get(record.status, [])
        if target_status not in valid:
            exc = ReviewSessionEmployeeStatusError(record.status, target_status)
            raise await self._resolve_domain_error(exc)

        record.status = target_status
        await self.session.commit()
        await self.session.refresh(record)

        schema = self._to_schema(record)
        emp_name = record.employee.name if record.employee else str(rse_id)
        detail = await self._resolve_domain_success(
            ReviewSessionEmployeeStatusChangeSuccess(emp_name, target_status)
        )
        return MutationResponse(detail=detail, data=schema)

    async def reopen(self, rse_id: int) -> MutationResponse[RSESchema]:
        """Force status directly to 'open' from any non-open state."""
        record = await self.get_by_id(rse_id)
        if record.status == "open":
            exc = ReviewSessionEmployeeStatusError(record.status, "open")
            raise await self._resolve_domain_error(exc)

        record.status = "open"
        await self.session.commit()
        await self.session.refresh(record)

        schema = self._to_schema(record)
        emp_name = record.employee.name if record.employee else str(rse_id)
        detail = await self._resolve_domain_success(
            ReviewSessionEmployeeStatusChangeSuccess(emp_name, "open")
        )
        return MutationResponse(detail=detail, data=schema)

    async def revert_status(self, rse_id: int) -> MutationResponse[RSESchema]:
        record = await self.get_by_id(rse_id)
        target = RSE_REVERT_TRANSITIONS.get(record.status)
        if target is None:
            exc = ReviewSessionEmployeeStatusError(record.status, "revert")
            raise await self._resolve_domain_error(exc)

        record.status = target
        await self.session.commit()
        await self.session.refresh(record)

        schema = self._to_schema(record)
        emp_name = record.employee.name if record.employee else str(rse_id)
        detail = await self._resolve_domain_success(
            ReviewSessionEmployeeStatusChangeSuccess(emp_name, target)
        )
        return MutationResponse(detail=detail, data=schema)
