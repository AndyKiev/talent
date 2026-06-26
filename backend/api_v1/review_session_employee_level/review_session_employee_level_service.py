from typing import Optional

from sqlalchemy import delete, select, text
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
    ProposedLevelStepTooHigh,
)
from backend.api_v1.review_session_employee.review_session_employee_repository import (
    ReviewSessionEmployeeRepository,
)
from backend.api_v1.review_session_employee.review_session_employee_service import (
    ReviewSessionEmployeeService,
)
from backend.api_v1.review_session_level.review_session_level_schema import (
    SessionLevelSchema,
)
from backend.api_v1.review_session_level.review_session_level_helper import (
    frozen_levels_for_session,
)


# Fixed namespace for the per-RSE advisory lock used by upsert_proposed_level.
# pg_advisory_xact_lock(classid, objid) is keyed (this constant, rse_id) so it
# never collides with advisory locks taken elsewhere. The lock auto-releases at
# COMMIT/ROLLBACK — no schema change — and makes overlapping upserts for the same
# RSE queue instead of racing on the read-then-create / delete-then-insert window.
_PROPOSED_LEVEL_LOCK_NAMESPACE = 4801


class ReviewSessionEmployeeLevelService(BaseService):
    def __init__(
        self,
        repository: ReviewSessionEmployeeLevelRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def _get_by_rse(self, rse_id: int) -> Optional[ReviewSessionEmployeeLevel]:
        return await self.repository.get_by_field("review_session_employee_id", rse_id)

    async def _assert_rse_visible(self, rse_id: int) -> None:
        """Delegate to the RSE service's people-review visibility guard so an
        out-of-scope employee's proposed level can't be reached by a typed-in URL."""
        rse_service = ReviewSessionEmployeeService(
            repository=ReviewSessionEmployeeRepository(session=self.session),
            user=self.user,
            session=self.session,
        )
        await rse_service.assert_rse_visible(rse_id)

    async def get_proposed_level(self, rse_id: int) -> Optional[ProposedLevelSchema]:
        await self._assert_rse_visible(rse_id)
        record = await self._get_by_rse(rse_id)
        if not record:
            return None
        return ProposedLevelSchema.model_validate(record)

    async def get_session_levels(self, rse_id: int) -> list[SessionLevelSchema]:
        """The session's FROZEN competency levels (+ requirements) for this rse, in
        the live-id shape the drawer expects. Falls back to live active levels for
        pre-freeze sessions (handled by the shared helper)."""
        from backend.api_v1.review_session_employee.review_session_employee_model import (
            ReviewSessionEmployee,
        )

        await self._assert_rse_visible(rse_id)
        session_id = await self.session.scalar(
            select(ReviewSessionEmployee.session_id).where(
                ReviewSessionEmployee.id == rse_id
            )
        )
        if session_id is None:
            return []
        return await frozen_levels_for_session(self.session, session_id)

    async def _assert_step_allowed(self, rse_id: int, target_level_id: int) -> None:
        """Enforce the +1 rule: a proposed level may be at most one rank above the
        employee's current level (no +2 jumps). Decreases are unrestricted. Rank is
        the position in the sort_order-ordered list of the session's FROZEN levels,
        so the rule matches exactly what the drawer offers (and stays correct even
        when sort_order values have gaps)."""
        from backend.api_v1.review_session_employee.review_session_employee_model import (
            ReviewSessionEmployee,
        )
        from backend.api_v1.employee.employee_model import Employee

        rse = await self.session.get(ReviewSessionEmployee, rse_id)
        current_level_id = None
        session_id = None
        if rse is not None:
            session_id = rse.session_id
            emp = await self.session.get(Employee, rse.employee_id)
            current_level_id = getattr(emp, "current_level_id", None) if emp else None

        levels = (
            await frozen_levels_for_session(self.session, session_id)
            if session_id is not None
            else []
        )
        ranks = {lvl.id: i for i, lvl in enumerate(levels)}
        target_rank = ranks.get(target_level_id)
        if target_rank is None:
            return  # unknown/inactive target — leave it to other validation
        # No current level → baseline is the base level (rank 0).
        current_rank = ranks.get(current_level_id, 0) if current_level_id else 0
        if target_rank > current_rank + 1:
            raise await self._resolve_domain_error(ProposedLevelStepTooHigh())

    async def upsert_proposed_level(
        self, rse_id: int, payload: ProposedLevelUpsert
    ) -> MutationResponse[ProposedLevelSchema]:
        await self._assert_rse_visible(rse_id)
        # Serialize concurrent upserts for the same RSE (e.g. rapid "add" presses
        # firing overlapping autosaves). Without this, two requests can both read
        # no record and race the create, or interleave the answer delete/insert,
        # holding row locks until they pile up and drain the connection pool — the
        # whole app then hangs. The lock is held until the single commit below.
        await self.session.execute(
            text("SELECT pg_advisory_xact_lock(:ns, :rse_id)"),
            {"ns": _PROPOSED_LEVEL_LOCK_NAMESPACE, "rse_id": rse_id},
        )

        record = await self._get_by_rse(rse_id)
        # Enforce the +1 step rule only when the level is actually being set or
        # changed — NOT on answer-only autosaves (those re-send the same level_id,
        # and a record already above +1, e.g. after the employee's current level was
        # later lowered, must still accept comment edits).
        if record is None or record.level_id != payload.level_id:
            await self._assert_step_allowed(rse_id, payload.level_id)
        if record is None:
            record = ReviewSessionEmployeeLevel(
                review_session_employee_id=rse_id,
                level_id=payload.level_id,
            )
            self.session.add(record)
            # flush (not commit) to populate record.id while keeping the whole
            # upsert in ONE transaction — the advisory lock stays held throughout.
            await self.session.flush()
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

        # Single commit: create/level-change, answer wipe and re-insert all land
        # atomically, and the advisory lock releases here.
        await self.session.commit()

        fresh = await self._get_by_rse(rse_id)
        schema = ProposedLevelSchema.model_validate(fresh)
        detail = await self._resolve_domain_success(ProposedLevelSaveSuccess())
        return MutationResponse(detail=detail, data=schema)

    async def delete_proposed_level(self, rse_id: int) -> MutationResponse[None]:
        await self._assert_rse_visible(rse_id)
        # Same per-RSE lock as the upsert, so a delete and a still-in-flight save
        # serialize instead of racing (a save must not re-create a deleted row).
        await self.session.execute(
            text("SELECT pg_advisory_xact_lock(:ns, :rse_id)"),
            {"ns": _PROPOSED_LEVEL_LOCK_NAMESPACE, "rse_id": rse_id},
        )
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
        await self._assert_rse_visible(rse_id)
        record = await self._get_by_rse(rse_id)
        if record is None:
            raise ProposedLevelNotFound(rse_id)
        record.status = payload.status
        await self.session.commit()
        fresh = await self._get_by_rse(rse_id)
        schema = ProposedLevelSchema.model_validate(fresh)
        detail = await self._resolve_domain_success(ProposedLevelStatusUpdateSuccess())
        return MutationResponse(detail=detail, data=schema)
