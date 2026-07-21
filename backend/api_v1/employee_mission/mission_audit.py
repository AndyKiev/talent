# backend/api_v1/employee_mission/mission_audit.py
#
# Thin shared writer/reader over the generic audit tables (change_session +
# change_log) for everything under an employee's development plan.
#
# Why here and not a per-essence copy: missions, KPIs, comments and the
# development vision are four services that must land in ONE run when they are
# touched together (creating a mission writes mission + KPI entries), and HR
# reads them back as a single timeline. One helper keeps the essence keys and the
# transaction discipline in a single place.
#
# Transaction discipline (the "manual single action" case from the
# ChangeSessionService docstring): the run row is created with commit=False and
# rides the caller's transaction, so a service that rolls back leaves no orphan
# run behind. Because a single request either commits wholly or not at all, the
# run is opened ALREADY closed ('success' + finished_at) — there is no window in
# which a half-finished run could be observed, and no post-commit bookkeeping
# call that could itself fail.
import datetime
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.audit.change_log.change_log_model import ChangeLog
from backend.api_v1.audit.change_log.change_log_schema import ChangeAction
from backend.api_v1.audit.change_session.change_session_model import ChangeSession
from backend.api_v1.employee.employee_minis import fetch_employee_minis
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.employee_mission.employee_mission_schema import (
    EmployeeMissionHistoryEntry,
)

# change_log.essence_key values. Free strings by design (no FK), so adding these
# needed no schema change.
ESSENCE_MISSION = "employee_mission"
ESSENCE_KPI = "employee_mission_kpi"
ESSENCE_COMMENT = "employee_mission_comment"
ESSENCE_VISION = "employee_development_vision"

# Essence keys whose entries make up a mission's visible history. Comments are
# deliberately excluded: they are visible content in their own right, not an
# audit concern.
HISTORY_ESSENCES = (ESSENCE_MISSION, ESSENCE_KPI)


class MissionAudit:
    """Per-request audit writer. One change_session is opened lazily and reused
    for every entry written during that request."""

    def __init__(
        self,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ) -> None:
        self.user = user
        self.session = session
        self._change_session_id: Optional[int] = None

    async def _run_id(self, employee_id: Optional[int]) -> int:
        """The change_session for this request, created on first use."""
        if self._change_session_id is not None:
            return self._change_session_id
        run = ChangeSession(
            source="manual",
            triggered_by_user_id=self.user.id if self.user else None,
            employee_id=employee_id,
            status="success",
            finished_at=datetime.datetime.now(datetime.timezone.utc),
        )
        self.session.add(run)
        await self.session.flush()  # assign PK without committing
        self._change_session_id = run.id
        return run.id

    async def _log(
        self,
        essence_key: str,
        entity_id: Optional[int],
        employee_id: Optional[int],
        action: ChangeAction,
        changes: Optional[dict] = None,
        parent_id: Optional[int] = None,
    ) -> ChangeLog:
        entry = ChangeLog(
            change_session_id=await self._run_id(employee_id),
            parent_id=parent_id,
            essence_key=essence_key,
            entity_id=entity_id,
            action=action.value if isinstance(action, ChangeAction) else action,
            changes=changes,
            employee_id=employee_id,
        )
        self.session.add(entry)
        await self.session.flush()  # assign PK so it can parent later rows
        return entry

    # ── writers ──────────────────────────────────────────────────────────────

    async def log_mission(
        self,
        mission_id: Optional[int],
        employee_id: int,
        action: ChangeAction,
        changes: Optional[dict] = None,
        parent_id: Optional[int] = None,
    ) -> ChangeLog:
        return await self._log(
            ESSENCE_MISSION, mission_id, employee_id, action, changes, parent_id
        )

    async def log_kpi(
        self,
        kpi_id: Optional[int],
        employee_id: int,
        action: ChangeAction,
        changes: Optional[dict] = None,
        parent_id: Optional[int] = None,
    ) -> ChangeLog:
        return await self._log(
            ESSENCE_KPI, kpi_id, employee_id, action, changes, parent_id
        )

    async def log_comment(
        self,
        comment_id: Optional[int],
        employee_id: int,
        action: ChangeAction,
        changes: Optional[dict] = None,
    ) -> ChangeLog:
        return await self._log(
            ESSENCE_COMMENT, comment_id, employee_id, action, changes
        )

    async def log_vision(
        self,
        vision_id: Optional[int],
        employee_id: int,
        action: ChangeAction,
        changes: Optional[dict] = None,
    ) -> ChangeLog:
        return await self._log(ESSENCE_VISION, vision_id, employee_id, action, changes)

    # ── reader ───────────────────────────────────────────────────────────────

    async def get_employee_history(
        self, employee_id: int
    ) -> List[EmployeeMissionHistoryEntry]:
        """EVERY mission/KPI entry for one employee, newest first — including
        entries for missions that no longer exist.

        This is the only place a DELETED mission can still be seen. The row
        itself is gone (FK CASCADE), but its change_log entries survive: the
        delete entry carries the mission's text in `changes.text.old`, and the
        KPI rows removed with it hang off that entry via `parent_id`. change_log
        keeps `employee_id` on every entry precisely so this query is possible
        without joining to a table whose rows may be gone.
        """
        stmt = (
            select(ChangeLog, ChangeSession)
            .join(ChangeSession, ChangeLog.change_session_id == ChangeSession.id)
            .where(
                ChangeLog.employee_id == employee_id,
                ChangeLog.essence_key.in_(HISTORY_ESSENCES),
            )
            .order_by(ChangeLog.created_at.desc(), ChangeLog.id.desc())
        )
        return await self._to_entries((await self.session.execute(stmt)).all())

    async def get_history(
        self, mission_id: int, kpi_ids: List[int]
    ) -> List[EmployeeMissionHistoryEntry]:
        """The mission's entries plus those of the given KPIs, newest first.

        KPI ids are passed in rather than re-derived because a DELETED KPI still
        has history worth showing, and its row is gone from employee_mission_kpis
        by then — the caller supplies whichever ids it can still see, and the
        mission's own cascade entries (logged with parent_id) cover the rest.
        """
        stmt = (
            select(ChangeLog, ChangeSession)
            .join(ChangeSession, ChangeLog.change_session_id == ChangeSession.id)
            .where(
                (
                    (ChangeLog.essence_key == ESSENCE_MISSION)
                    & (ChangeLog.entity_id == mission_id)
                )
                | (
                    (ChangeLog.essence_key == ESSENCE_KPI)
                    & (ChangeLog.entity_id.in_(kpi_ids if kpi_ids else [0]))
                )
            )
            .order_by(ChangeLog.created_at.desc(), ChangeLog.id.desc())
        )
        return await self._to_entries((await self.session.execute(stmt)).all())

    async def _to_entries(self, rows) -> List[EmployeeMissionHistoryEntry]:
        """Shape (ChangeLog, ChangeSession) pairs into API entries, naming the
        actor from one column-only lookup."""
        minis = await fetch_employee_minis(
            self.session, [run.triggered_by_user_id for _, run in rows]
        )
        return [
            EmployeeMissionHistoryEntry(
                id=log.id,
                entity_kind=log.essence_key,
                entity_id=log.entity_id,
                action=log.action,
                changes=log.changes,
                # No actor for system runs (the data migration) — the UI shows
                # the task instead of a person.
                actor_name=(
                    minis[run.triggered_by_user_id]["name"]
                    if minis.get(run.triggered_by_user_id)
                    else run.task_name
                ),
                changed_at=log.created_at,
            )
            for log, run in rows
        ]
