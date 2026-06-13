from typing import Optional

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.review_session_employee_level.review_session_employee_level_repository import (
    ReviewSessionEmployeeLevelRepository,
)
from backend.api_v1.review_session_employee_level.review_session_employee_level_model import (
    ReviewSessionEmployeeLevel,
)
from backend.api_v1.review_session_employee_level.review_session_employee_level_schema import (
    ProposedLevelSchema,
    ProposedLevelUpsert,
    ProposedLevelStatusUpdate,
)
from backend.api_v1.review_session_employee_level_answer.review_session_employee_level_answer_model import (
    ReviewSessionEmployeeLevelAnswer,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.review_session_employee_level.review_session_employee_level_success import (
    ProposedLevelSaveSuccess,
    ProposedLevelDeleteSuccess,
    ProposedLevelStatusUpdateSuccess,
)
from backend.api_v1.review_session_employee_level.review_session_employee_level_errors import (
    ProposedLevelNotFound,
)


class ReviewSessionEmployeeLevelService(BaseService):
    def __init__(
        self,
        repository: ReviewSessionEmployeeLevelRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def _get_by_rse(self, rse_id: int) -> Optional[ReviewSessionEmployeeLevel]:
        return await self.repository.get_by_field(
            "review_session_employee_id", rse_id
        )

    async def get_proposed_level(
        self, rse_id: int
    ) -> Optional[ProposedLevelSchema]:
        record = await self._get_by_rse(rse_id)
        if not record:
            return None
        return ProposedLevelSchema.model_validate(record)

    async def upsert_proposed_level(
        self, rse_id: int, payload: ProposedLevelUpsert
    ) -> MutationResponse[ProposedLevelSchema]:
        record = await self._get_by_rse(rse_id)
        if record is None:
            record = ReviewSessionEmployeeLevel(
                review_session_employee_id=rse_id,
                level_id=payload.level_id,
            )
            self.session.add(record)
            await self.session.commit()
            await self.session.refresh(record)
        else:
            # Re-picking a different target level makes it a fresh proposal, so any
            # prior validated/rejected decision no longer applies — reset to proposed.
            if record.level_id != payload.level_id:
                record.status = "proposed"
            record.level_id = payload.level_id
            # Replace answers wholesale (level may have changed).
            await self.session.execute(
                delete(ReviewSessionEmployeeLevelAnswer).where(
                    ReviewSessionEmployeeLevelAnswer.review_session_employee_level_id
                    == record.id
                )
            )
            await self.session.commit()

        new_answers = [
            ReviewSessionEmployeeLevelAnswer(
                review_session_employee_level_id=record.id,
                requirement_id=a.requirement_id,
                facts=a.facts,
            )
            for a in payload.answers
            if a.facts and a.facts.strip()
        ]
        if new_answers:
            self.session.add_all(new_answers)
            await self.session.commit()

        fresh = await self._get_by_rse(rse_id)
        schema = ProposedLevelSchema.model_validate(fresh)
        detail = await self._resolve_domain_success(ProposedLevelSaveSuccess())
        return MutationResponse(detail=detail, data=schema)

    async def delete_proposed_level(self, rse_id: int) -> MutationResponse[None]:
        record = await self._get_by_rse(rse_id)
        if record is None:
            raise ProposedLevelNotFound(rse_id)
        # Linked answers cascade-delete via the model relationship.
        await self.session.delete(record)
        await self.session.commit()
        detail = await self._resolve_domain_success(ProposedLevelDeleteSuccess())
        return MutationResponse(detail=detail, data=None)

    async def set_status(
        self, rse_id: int, payload: ProposedLevelStatusUpdate
    ) -> MutationResponse[ProposedLevelSchema]:
        record = await self._get_by_rse(rse_id)
        if record is None:
            raise ProposedLevelNotFound(rse_id)
        record.status = payload.status
        await self.session.commit()
        fresh = await self._get_by_rse(rse_id)
        schema = ProposedLevelSchema.model_validate(fresh)
        detail = await self._resolve_domain_success(ProposedLevelStatusUpdateSuccess())
        return MutationResponse(detail=detail, data=schema)
