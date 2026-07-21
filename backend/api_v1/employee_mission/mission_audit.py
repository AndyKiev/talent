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
from sqlalchemy.orm import aliased
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.audit.change_log.change_log_model import ChangeLog
from backend.api_v1.audit.change_log.change_log_schema import ChangeAction
from backend.api_v1.audit.change_session.change_session_model import ChangeSession
from backend.api_v1.employee.employee_minis import fetch_employee_minis
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.employee_mission_kpi.employee_mission_kpi_model import (
    EmployeeMissionKpi,
)
from backend.api_v1.review_dimension.review_dimension_model import ReviewDimension
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

# Fields recorded for provenance but meaningless to a reader. `dimension_id` is
# not hidden — it is REPLACED by the competence name (see _humanize).
HIDDEN_CHANGE_FIELDS = {"migrated_from_rse_id", "reverted"}


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

    async def _kpi_mission_map(self, kpi_ids: List[int]) -> dict:
        """kpi id -> mission id, for grouping. Live rows answer directly; a KPI
        deleted with its mission is resolved through the parent_id link its
        delete entry carries."""
        ids = [i for i in kpi_ids if i]
        if not ids:
            return {}
        out = {
            k: m
            for k, m in await self.session.execute(
                select(EmployeeMissionKpi.id, EmployeeMissionKpi.mission_id).where(
                    EmployeeMissionKpi.id.in_(ids)
                )
            )
        }
        missing = [i for i in ids if i not in out]
        if missing:
            child = aliased(ChangeLog)
            parent = aliased(ChangeLog)
            rows = await self.session.execute(
                select(child.entity_id, parent.entity_id)
                .join(parent, child.parent_id == parent.id)
                .where(
                    child.essence_key == ESSENCE_KPI,
                    child.entity_id.in_(missing),
                    parent.essence_key == ESSENCE_MISSION,
                )
            )
            for kpi_id, mission_id in rows:
                out.setdefault(kpi_id, mission_id)
        return out

    @staticmethod
    def _mission_labels(rows) -> dict:
        """mission id -> its text, taken from the trail so a DELETED mission is
        still named rather than showing as a bare id."""
        labels = {}
        for log, _ in rows:
            if log.essence_key != ESSENCE_MISSION or not log.entity_id:
                continue
            pair = (log.changes or {}).get("text") or {}
            text = pair.get("new") or pair.get("old")
            if text and log.entity_id not in labels:
                labels[log.entity_id] = str(text)[:80]
        return labels

    # ── previous-progress lookups (the revert feature) ───────────────────────

    async def _percent_history(self, kpi_ids: List[int]):
        """Every logged percent change for the given KPIs, newest first."""
        if not kpi_ids:
            return []
        stmt = (
            select(ChangeLog.entity_id, ChangeLog.changes)
            .where(
                ChangeLog.essence_key == ESSENCE_KPI,
                ChangeLog.entity_id.in_(kpi_ids),
                ChangeLog.changes.has_key("percent"),  # noqa: W601 - JSONB operator
            )
            .order_by(ChangeLog.created_at.desc(), ChangeLog.id.desc())
        )
        return (await self.session.execute(stmt)).all()

    async def previous_kpi_percents(self, kpi_ids: List[int]) -> dict[int, int]:
        """kpi id -> the percentage it held BEFORE its most recent change.

        Reads `changes.percent.old` of the newest entry per KPI, which is exactly
        "one step back". Entries whose old value is absent are skipped rather
        than guessed at.
        """
        out: dict[int, int] = {}
        for entity_id, changes in await self._percent_history(kpi_ids):
            if entity_id in out:
                continue  # newest wins; the rest are older steps
            old = (changes or {}).get("percent", {}).get("old")
            if isinstance(old, int):
                out[entity_id] = old
        return out

    async def kpis_with_previous_percent(self, kpi_ids: List[int]) -> set[int]:
        """Which KPIs have somewhere to revert to — drives the UI affordance."""
        return set((await self.previous_kpi_percents(kpi_ids)).keys())

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

    async def _dimension_names(self, rows) -> dict:
        """id -> name for every competence mentioned in these entries.

        HRS and HR read this trail; a bare `dimension_id: 3 -> 5` is unreadable
        to them. One column-only query covers the whole page.
        """
        ids = set()
        for log, _ in rows:
            pair = (log.changes or {}).get("dimension_id") or {}
            for side in ("old", "new"):
                if isinstance(pair.get(side), int):
                    ids.add(pair[side])
        if not ids:
            return {}
        rows_ = await self.session.execute(
            select(ReviewDimension.id, ReviewDimension.name).where(
                ReviewDimension.id.in_(ids)
            )
        )
        return {i: n for i, n in rows_}

    @staticmethod
    def _humanize(changes: Optional[dict], dim_names: dict) -> Optional[dict]:
        """Drop bookkeeping fields and swap competence ids for their names."""
        if not changes:
            return changes
        out = {}
        for field, pair in changes.items():
            if field in HIDDEN_CHANGE_FIELDS:
                continue
            if field == "dimension_id" and isinstance(pair, dict):
                out["competence"] = {
                    side: (dim_names.get(pair.get(side)) if pair.get(side) else None)
                    for side in ("old", "new")
                }
                continue
            out[field] = pair
        return out or None

    async def _to_entries(self, rows) -> List[EmployeeMissionHistoryEntry]:
        """Shape (ChangeLog, ChangeSession) pairs into API entries, naming the
        actor from one column-only lookup."""
        minis = await fetch_employee_minis(
            self.session, [run.triggered_by_user_id for _, run in rows]
        )
        dim_names = await self._dimension_names(rows)
        # A mission's own entries carry its id directly; a KPI entry inherits the
        # mission it belonged to, so the UI can group both under one heading.
        kpi_owner = await self._kpi_mission_map(
            [log.entity_id for log, _ in rows if log.essence_key == ESSENCE_KPI]
        )
        labels = self._mission_labels(rows)
        return [
            EmployeeMissionHistoryEntry(
                id=log.id,
                entity_kind=log.essence_key,
                entity_id=log.entity_id,
                action=log.action,
                changes=self._humanize(log.changes, dim_names),
                mission_id=(
                    log.entity_id
                    if log.essence_key == ESSENCE_MISSION
                    else kpi_owner.get(log.entity_id)
                ),
                mission_label=labels.get(
                    log.entity_id
                    if log.essence_key == ESSENCE_MISSION
                    else kpi_owner.get(log.entity_id)
                ),
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
