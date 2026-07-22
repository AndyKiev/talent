# backend/api_v1/employee_recommended_training/employee_recommended_training_access.py
#
# The single authority for WHO may read and write an employee's recommended
# trainings.
#
# The rule differs from development missions in one decisive way: here the
# EMPLOYEE is a legitimate author. Missions are written ABOUT someone by their
# manager, so `EmployeeMissionAccess._is_oversight_for` deliberately excludes
# self. A recommended training is a shared list — the employee may add one for
# themselves and update how far along they are — so self is allowed here.
#
# Three levels, matching what the two roles are trusted with:
#
#   assert_can_read   -> admin/dev, the employee, their line manager
#                        (supervision), their oversight manager
#   assert_can_write  -> admin/dev, the EMPLOYEE, their oversight manager
#                        (add, edit the description, change status, toggle
#                        is_active)
#   assert_can_delete -> admin/dev, their oversight manager ONLY
#
# Delete is narrower than write on purpose: an employee marking a recommendation
# inactive keeps the record and the history, whereas deleting it would let them
# erase advice their manager gave them.
#
# Enforced in the SERVICE rather than as a route dependency, because the
# id-keyed routes (`PATCH /employee_recommended_trainings/{id}`) carry no
# `{employee_id}` for a guard to scope on — the service resolves the owner
# first. Ids are sequential, so an unguarded read would let anyone walk them.
#
# Lazy-imports the RSE service inside the methods so the auth <-> routers import
# graph stays acyclic (same trick as employee_mission_access.py).
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.msg_pg.msg_translate import translate_key
from backend.utils.enums import EssenceName, OperationVerb

ESSENCE = EssenceName.EMPLOYEE_RECOMMENDED_TRAINING


class EmployeeRecommendedTrainingAccess:
    """Permission checks for recommended trainings. Construct per request."""

    def __init__(
        self,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ) -> None:
        self.user = user
        self.session = session

    # ── internals ────────────────────────────────────────────────────────────

    def _is_admin(self, verb: OperationVerb) -> bool:
        """True when the caller holds the blanket admin grant for (verb, essence).

        In-memory only — no query — so admin/dev short-circuit before any roster
        resolution. Also the lockout safety net: however wrong the roster logic
        might be, an admin can always fix the data.
        """
        if not self.user:
            return False
        if getattr(self.user, "is_bypass", False):
            return True
        return (verb.value, frozenset({ESSENCE.value})) in self.user.permission_sets

    async def _deny(self, message_key: str, fallback: str) -> None:
        lang_id = getattr(self.user, "lang_id", None) if self.user else None
        detail = fallback
        if self.session is not None and lang_id is not None:
            detail = await translate_key(
                self.session, message_key, lang_id, fallback=fallback
            )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)

    def _rse_service(self):
        from backend.api_v1.review_session_employee.review_session_employee_service import (
            ReviewSessionEmployeeService,
        )
        from backend.api_v1.review_session_employee.review_session_employee_repository import (
            ReviewSessionEmployeeRepository,
        )

        return ReviewSessionEmployeeService(
            repository=ReviewSessionEmployeeRepository(session=self.session),
            user=self.user,
            session=self.session,
        )

    async def _is_oversight_for(self, employee_id: int) -> bool:
        """True when the caller's ACTIVE role is oversight and `employee_id` is on
        their roster.

        The roster comes from the process-role holder links, NOT from
        review_session_employees, so a manager can add the first recommendation
        for someone who has never been in a review session. It DOES depend on the
        user's active mode: with no mode selected the backend sees "only myself"
        and refuses, which the UI explains rather than looking broken.

        `link_target == 'employee'` only — a supervision (department) role is
        read-only here. Unlike the missions equivalent this does NOT exclude
        self, because self is handled by its own branch in the callers below.
        """
        if not self.user or not self.session:
            return False
        service = self._rse_service()
        role = await service.get_active_role()
        if role is None or role.link_target != "employee":
            return False
        return employee_id in await service._visible_employee_ids()

    # ── public checks ────────────────────────────────────────────────────────

    async def assert_can_read(self, employee_id: int) -> None:
        """Read gate for routes keyed by recommendation id.

        Reproduces the audience `PeopleReviewScopedGuard` gives the
        `/employee/{employee_id}` routes (admin, the employee, their line
        manager, their oversight manager) after the service has resolved the
        owner from the row.
        """
        if not self.user or not self.session:
            await self._deny(
                "recommendedTrainingReadDenied",
                "You may not view these recommended trainings",
            )
            return
        if self._is_admin(OperationVerb.VIEW):
            return
        if await self._rse_service().is_employee_visible(employee_id):
            return
        await self._deny(
            "recommendedTrainingReadDenied",
            "You may not view these recommended trainings",
        )

    async def can_write(self, employee_id: int, verb: OperationVerb) -> bool:
        """Non-raising form of assert_can_write (used to compute UI flags)."""
        if self._is_admin(verb):
            return True
        if self.user and employee_id == self.user.id:
            return True
        return await self._is_oversight_for(employee_id)

    async def assert_can_write(self, employee_id: int, verb: OperationVerb) -> None:
        """Gate for adding a recommendation and for editing its description,
        status or is_active flag. The employee and their oversight manager both
        qualify."""
        if not await self.can_write(employee_id, verb):
            await self._deny(
                "recommendedTrainingWriteDenied",
                "Only the employee or their oversight manager may change these "
                "recommended trainings",
            )

    async def can_delete(self, employee_id: int) -> bool:
        """Non-raising form of assert_can_delete (used to compute UI flags)."""
        if self._is_admin(OperationVerb.DELETE):
            return True
        return await self._is_oversight_for(employee_id)

    async def assert_can_delete(self, employee_id: int) -> None:
        """Gate for removing a recommendation outright — oversight or admin only.

        The employee's way to retire one is `is_active = false`, which keeps the
        record. Letting them delete would let them erase their manager's advice.
        """
        if not await self.can_delete(employee_id):
            await self._deny(
                "recommendedTrainingDeleteDenied",
                "Only the oversight manager may delete a recommended training",
            )
