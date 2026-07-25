# backend/api_v1/employee_mission/employee_mission_access.py
#
# The single authority for WHO may write an employee's development missions.
#
# Reads are handled by the existing route guard
# `PeopleReviewScopedGuard(VIEW, EssenceName.EMPLOYEE_MISSION)` — it already
# passes for admin, the employee themselves, their line manager (supervision
# mode) and an oversight manager whose roster contains them. That is exactly the
# read audience we want, so reads need no new code.
#
# Writes are NOT expressible with either existing guard:
#   * PeopleReviewScopedGuard passes for SELF and for SUPERVISION — both must be
#     read-only here (an employee must not edit their own plan, and a line
#     manager must not either).
#   * Plain Guard passes only for admin — but the oversight manager, who is the
#     intended author, is not an admin.
# Hence `assert_can_manage`: admin/dev, or the oversight manager whose ROSTER
# contains the employee — and never for oneself.
#
# Two write levels exist, deliberately kept apart:
#   assert_can_manage  -> missions, KPIs, KPI fulfilment percent, competence link
#   assert_can_author  -> mission comments and the employee's development vision
#                         (the EMPLOYEE's own write surface)
#
# Enforced in the SERVICE, not as a route dependency, because the id-keyed routes
# (`PATCH /employee_mission_kpis/{kpi_id}`) have no `{employee_id}` path param —
# the service resolves kpi -> mission -> employee_id first. Route guards are used
# only on the `/employee/{employee_id}`-shaped routes.
#
# Lazy-imports the RSE service inside the methods so the auth <-> routers import
# graph stays acyclic (same trick as people_review_access.py).

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.msg_pg.msg_translate import translate_key
from backend.utils.enums import EssenceName, OperationVerb


class EmployeeMissionAccess:
    """Permission checks for development-mission writes. Construct per request."""

    def __init__(
        self,
        user: EmployeeSchema | None = None,
        session: AsyncSession | None = None,
    ) -> None:
        self.user = user
        self.session = session

    # ── internals ────────────────────────────────────────────────────────────

    def _is_admin(self, verb: OperationVerb, essence: EssenceName) -> bool:
        """True when the caller holds the blanket admin grant for (verb, essence).

        In-memory only — no query — so admin/dev short-circuit before any roster
        resolution. This is also the lockout safety net: however wrong the roster
        logic might be, an admin can always fix the data.
        """
        if not self.user:
            return False
        if getattr(self.user, "is_bypass", False):
            return True
        return (verb.value, frozenset({essence.value})) in self.user.permission_sets

    async def _deny(self, message_key: str, fallback: str) -> None:
        lang_id = getattr(self.user, "lang_id", None) if self.user else None
        detail = fallback
        if self.session is not None and lang_id is not None:
            detail = await translate_key(
                self.session, message_key, lang_id, fallback=fallback
            )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)

    async def _is_oversight_for(self, employee_id: int) -> bool:
        """True when the caller's ACTIVE role is oversight and `employee_id` is on
        their roster.

        `_visible_employee_ids()` resolves the roster from the process-role holder
        links (`get_roster_employee_ids`), NOT from review_session_employees rows,
        so this stays true for an employee who has never been in a review session
        — which is what lets a manager create someone's very first mission.

        Two deliberate exclusions:
          * `link_target == 'employee'` only — a supervision (department) role is
            read-only here.
          * `employee_id != self.user.id` — own id is ALWAYS in the visible set,
            so without this an oversight manager could set their own fulfilment
            percentages.
        """
        if not self.user or not self.session:
            return False
        if employee_id == self.user.id:
            return False

        from backend.api_v1.review_session_employee.review_session_employee_repository import (
            ReviewSessionEmployeeRepository,
        )
        from backend.api_v1.review_session_employee.review_session_employee_service import (
            ReviewSessionEmployeeService,
        )

        service = ReviewSessionEmployeeService(
            repository=ReviewSessionEmployeeRepository(session=self.session),
            user=self.user,
            session=self.session,
        )
        role = await service.get_active_role()
        if role is None or role.link_target != "employee":
            return False
        return employee_id in await service._visible_employee_ids()

    # ── public checks ────────────────────────────────────────────────────────

    def is_admin_like(self) -> bool:
        """Admin or dev (bypass). Used for the few operations that are not
        roster-scoped at all — currently reverting a mission's progress, which
        rewrites an assessment and so is deliberately not an oversight power."""
        if not self.user:
            return False
        if getattr(self.user, "is_bypass", False):
            return True
        return (
            OperationVerb.MODIFY.value,
            frozenset({EssenceName.EMPLOYEE_MISSION.value}),
        ) in self.user.permission_sets

    async def assert_can_read(self, employee_id: int) -> None:
        """Read gate for routes keyed by mission_id / comment_id.

        `PeopleReviewScopedGuard` cannot be used on those routes — it reads an
        `{employee_id}` path parameter that they do not have — so the same
        audience (admin, the employee, their line manager, their oversight
        manager) is reproduced here after the service resolves the owner.

        Without this, mission ids being sequential integers, any logged-in user
        could walk them and read somebody else's plan comments.
        """
        if not self.user or not self.session:
            await self._deny("missionReadDenied", "You may not view this plan")
            return
        if getattr(self.user, "is_bypass", False):
            return
        if (
            OperationVerb.VIEW.value,
            frozenset({EssenceName.EMPLOYEE_MISSION.value}),
        ) in self.user.permission_sets:
            return

        from backend.api_v1.review_session_employee.review_session_employee_repository import (
            ReviewSessionEmployeeRepository,
        )
        from backend.api_v1.review_session_employee.review_session_employee_service import (
            ReviewSessionEmployeeService,
        )

        service = ReviewSessionEmployeeService(
            repository=ReviewSessionEmployeeRepository(session=self.session),
            user=self.user,
            session=self.session,
        )
        if await service.is_employee_visible(employee_id):
            return
        await self._deny("missionReadDenied", "You may not view this plan")

    async def can_manage(self, employee_id: int, verb: OperationVerb) -> bool:
        """Non-raising form of assert_can_manage (used to compute UI flags)."""
        if self._is_admin(verb, EssenceName.EMPLOYEE_MISSION):
            return True
        return await self._is_oversight_for(employee_id)

    async def assert_can_manage(self, employee_id: int, verb: OperationVerb) -> None:
        """Gate for missions, KPIs, fulfilment percent and the competence link."""
        if not await self.can_manage(employee_id, verb):
            await self._deny(
                "missionManageDenied",
                "Only the oversight manager may change this employee's missions",
            )

    def can_author(self, employee_id: int, verb: OperationVerb) -> bool:
        """True when the caller may write the employee's OWN content (comments,
        development vision): the employee themselves, or admin/dev."""
        if not self.user:
            return False
        if self._is_admin(verb, EssenceName.EMPLOYEE_MISSION_COMMENT):
            return True
        return employee_id == self.user.id

    async def assert_can_author(self, employee_id: int, verb: OperationVerb) -> None:
        """Gate for creating a comment / saving the development vision."""
        if not self.can_author(employee_id, verb):
            await self._deny(
                "missionAuthorDenied",
                "You may only write on your own development plan",
            )

    async def assert_owns_comment(self, author_employee_id: int) -> None:
        """Editing or deleting an existing comment is limited to its author
        (admin/dev may fix anyone's)."""
        if self._is_admin(
            OperationVerb.MODIFY, EssenceName.EMPLOYEE_MISSION_COMMENT
        ) or (self.user and author_employee_id == self.user.id):
            return
        await self._deny(
            "missionAuthorDenied",
            "You may only edit your own comments",
        )
