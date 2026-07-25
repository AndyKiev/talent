from datetime import date

from dateutil.relativedelta import relativedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.app_setting.app_setting_service import get_int_setting
from backend.api_v1.audit.change_log.change_log_schema import ChangeAction
from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee.employee_minis import fetch_employee_minis
from backend.api_v1.employee.employee_model import Employee
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.employee_mission.employee_mission_access import (
    EmployeeMissionAccess,
)
from backend.api_v1.employee_mission.employee_mission_messages import (
    EmployeeMissionCreateSuccess,
    EmployeeMissionDeleteSuccess,
    EmployeeMissionNotFound,
    EmployeeMissionUpdateSuccess,
    MissionDimensionNotFound,
    MissionDurationOutOfRange,
    MissionEmployeeNotFound,
    MissionMaxActiveReached,
    MissionMaxKpisReached,
    MissionNothingToRevert,
    MissionRevertDenied,
    MissionRevertSuccess,
    MissionStatusNotSeeded,
)
from backend.api_v1.employee_mission.employee_mission_repository import (
    EmployeeMissionRepository,
)
from backend.api_v1.employee_mission.employee_mission_schema import (
    EmployeeMissionCreate,
    EmployeeMissionHistoryEntry,
    EmployeeMissionSchema,
    EmployeeMissionUpdate,
)
from backend.api_v1.employee_mission.mission_audit import MissionAudit
from backend.api_v1.employee_mission_dimension_link.employee_mission_dimension_link_model import (
    EmployeeMissionDimensionLink,
)
from backend.api_v1.employee_mission_kpi.employee_mission_kpi_model import (
    EmployeeMissionKpi,
)
from backend.api_v1.employee_mission_status.employee_mission_status_model import (
    COMPLETED,
    IN_PROCESS,
    PLANNED,
    EmployeeMissionStatus,
)
from backend.api_v1.review_dimension.review_dimension_model import ReviewDimension
from backend.utils.enums import OperationVerb

# Defaults when the app setting rows are missing. Mirror seed_app_settings.
DEFAULT_MAX_DURATION_MONTHS = 36
DEFAULT_MAX_KPIS = 2
DEFAULT_MAX_ACTIVE_MISSIONS = 5
# KPI display order step, matching the reorder helpers in BaseService.
KPI_SORT_STEP = 10
# A KPI counts as met at this figure; a mission is accomplished when all its
# KPIs reach it.
KPI_COMPLETE_PERCENT = 100


def compute_status_key(mission) -> str:
    """THE status rule, in one place.

    completed  - every KPI at 100%
    in_process - at least one KPI has some progress
    planned    - nothing started yet

    Status is always derived, never edited directly. That is what makes the
    admin/dev "revert" meaningful: it restores earlier KPI percentages, and the
    status follows automatically instead of the two disagreeing.
    """
    if is_mission_accomplished(mission):
        return COMPLETED
    if any(kpi.percent > 0 for kpi in mission.kpis):
        return IN_PROCESS
    return PLANNED


def compute_end_date(start_date: date, duration_months: int) -> date:
    """start_date + duration_months, month-arithmetic aware.

    relativedelta (not timedelta) so 31 Jan + 1 month lands on 28/29 Feb instead
    of overflowing into March. Shared with the data-migration script.
    """
    return start_date + relativedelta(months=duration_months)


def months_between(start_date: date, end_date: date) -> int:
    """Whole months in a mission's period — the inverse of compute_end_date.

    Duration is no longer stored, so this is how the form and the cards get the
    number back. Uses the same month arithmetic as compute_end_date, walking up
    from 0 so an end date that relativedelta clamped (31 Jan + 1m -> 28 Feb)
    still round-trips to the duration that produced it.
    """
    if end_date <= start_date:
        return 0
    months = (end_date.year - start_date.year) * 12 + (
        end_date.month - start_date.month
    )
    # Clamping can leave us one month over; step back until it fits.
    while months > 0 and compute_end_date(start_date, months) > end_date:
        months -= 1
    return months


def is_mission_accomplished(mission) -> bool:
    """Every KPI at 100%. A mission always has at least one KPI, but an empty
    list must NOT read as accomplished — that would be "done because nothing was
    asked", so guard it explicitly."""
    if not mission.kpis:
        return False
    return all(kpi.percent >= KPI_COMPLETE_PERCENT for kpi in mission.kpis)


def is_mission_expired(mission, today: date | None = None) -> bool:
    """The mission's period has ended. Day granularity, so a mission ending today
    is still running for the whole of today."""
    return mission.end_date < (today or date.today())


def is_mission_active(mission, today: date | None = None) -> bool:
    """THE definition of an active mission — the single place it is decided.

    Active = the period has not ended AND the work is not finished. Both exits
    matter: an employee who completes their missions, or simply outlives their
    period, frees a slot under `mission_max_active` without anyone having to
    delete history.
    """
    return not is_mission_expired(mission, today) and not is_mission_accomplished(
        mission
    )


class EmployeeMissionService(BaseService):
    """
    Development missions owned by an EMPLOYEE.

    Everything ordinary (get_by_id with a translated not-found, get_all, update,
    delete) comes from BaseService. What lives here is the four things base
    cannot know:
      1. end_date is derived, never client-supplied (compute_end_date);
      2. duration is bounded by an app setting, not a DB CHECK;
      3. create is ATOMIC across three tables (mission + >=1 KPI + optional
         competence link) — a mission must never exist without a KPI;
      4. every mutation is attributed via change_session/change_log, which is
         also the source of the history HR reads.
    """

    def __init__(
        self,
        repository: EmployeeMissionRepository,
        user: EmployeeSchema | None = None,
        session: AsyncSession | None = None,
    ) -> None:
        super().__init__(repository, user=user, session=session)
        self.access = EmployeeMissionAccess(user=user, session=session)
        self.audit = MissionAudit(user=user, session=session)

    # ── helpers ──────────────────────────────────────────────────────────────

    async def _max_duration_months(self) -> int:
        return await get_int_setting(
            self.session,
            "mission_max_duration_months",
            default=DEFAULT_MAX_DURATION_MONTHS,
        )

    async def _validate_duration(self, duration_months: int) -> None:
        max_months = await self._max_duration_months()
        if not 1 <= duration_months <= max_months:
            raise await self._resolve_domain_error(
                MissionDurationOutOfRange(max_months)
            )

    async def max_kpis(self) -> int:
        return await get_int_setting(
            self.session, "mission_max_kpis", default=DEFAULT_MAX_KPIS
        )

    async def _validate_kpi_count(self, count: int) -> None:
        cap = await self.max_kpis()
        if count > cap:
            raise await self._resolve_domain_error(MissionMaxKpisReached(cap))

    async def _assert_active_capacity(self, employee_id: int) -> None:
        """Refuse a new mission when the employee is already at their active cap.

        Counted in Python rather than SQL because "active" depends on the KPI
        percentages (accomplished) as well as the date — the same rule the UI
        shows, kept in one place (is_mission_active).
        """
        cap = await get_int_setting(
            self.session, "mission_max_active", default=DEFAULT_MAX_ACTIVE_MISSIONS
        )
        existing = await self.repository.get_for_employee(employee_id)
        active = sum(1 for m in existing if is_mission_active(m))
        if active >= cap:
            raise await self._resolve_domain_error(MissionMaxActiveReached(cap))

    async def _status_id_for_key(self, key: str) -> int:
        """Resolve a seeded status BY KEY, never by id — ids differ per database
        (reseed / id-reorder), keys do not."""
        status_id = await self.session.scalar(
            select(EmployeeMissionStatus.id).where(EmployeeMissionStatus.key == key)
        )
        if status_id is None:
            raise await self._resolve_domain_error(MissionStatusNotSeeded(key))
        return status_id

    async def apply_status(self, mission, *, log: bool = True) -> str | None:
        """Recompute the mission's status from its KPIs and persist any change.

        Called after every write that can move a KPI. Returns the new key when it
        changed (so the caller can surface it), None otherwise. The change is
        recorded in the trail as a first-class `status` field, which is what makes
        "when did this become completed?" answerable.
        """
        old_key = mission.status.key if mission.status else None
        new_key = compute_status_key(mission)
        if old_key == new_key:
            return None
        mission.status_id = await self._status_id_for_key(new_key)
        # Drop the stale relationship so the refreshed read reflects the new row
        # (the session is expire_on_commit=False, so it would otherwise persist).
        mission.status = await self.session.get(
            EmployeeMissionStatus, mission.status_id
        )
        if log:
            await self.audit.log_mission(
                mission_id=mission.id,
                employee_id=mission.employee_id,
                action=ChangeAction.STATUS_CHANGE,
                changes={"status": {"old": old_key, "new": new_key}},
            )
        return new_key

    async def _assert_employee_exists(self, employee_id: int) -> None:
        """Without this the insert violates the employees FK and surfaces as a
        500. The route only proves the CALLER may write for this id, not that the
        id exists — an admin passes the permission check for anything."""
        found = await self.session.scalar(
            select(Employee.id).where(Employee.id == employee_id)
        )
        if found is None:
            raise await self._resolve_domain_error(MissionEmployeeNotFound(employee_id))

    async def _assert_dimension_exists(self, dimension_id: int) -> None:
        found = await self.session.scalar(
            select(ReviewDimension.id).where(ReviewDimension.id == dimension_id)
        )
        if found is None:
            raise await self._resolve_domain_error(
                MissionDimensionNotFound(dimension_id)
            )

    async def _get_mission_or_404(self, mission_id: int):
        record = await self.repository.get_by_id(mission_id)
        if not record:
            raise await self._resolve_domain_error(EmployeeMissionNotFound(mission_id))
        return record

    async def _to_schema(self, records: list) -> list[EmployeeMissionSchema]:
        """Serialize missions, flattening the competence link and naming comment
        authors from a single column-only lookup (never a selectin on Employee —
        that would drag its whole 13-way graph per comment)."""
        author_ids = [c.author_employee_id for r in records for c in r.comments]
        minis = await fetch_employee_minis(self.session, author_ids)
        # Which KPIs have an earlier percent in the trail — one query for the
        # whole page rather than one per mission.
        revertable = await self.audit.kpis_with_previous_percent(
            [k.id for r in records for k in r.kpis]
        )

        today = date.today()
        out: list[EmployeeMissionSchema] = []
        for record in records:
            schema = EmployeeMissionSchema.model_validate(record)
            schema.duration_months = months_between(record.start_date, record.end_date)
            schema.status_key = record.status.key if record.status else ""
            schema.is_expired = is_mission_expired(record, today)
            schema.is_accomplished = is_mission_accomplished(record)
            schema.is_active = is_mission_active(record, today)
            schema.can_revert = any(k.id in revertable for k in record.kpis)
            link = record.dimension_link
            if link is not None:
                schema.dimension_id = link.dimension_id
                if link.dimension is not None:
                    schema.dimension_name = link.dimension.name
                    schema.dimension_color = link.dimension.color
            for comment in schema.comments:
                mini = minis.get(comment.author_employee_id)
                comment.author_name = mini["name"] if mini else None
            out.append(schema)
        return out

    # ── reads ────────────────────────────────────────────────────────────────

    async def get_missions_for_employee(
        self, employee_id: int
    ) -> list[EmployeeMissionSchema]:
        """Newest first. Route-level PeopleReviewScopedGuard already established
        that the caller may see this employee."""
        records = await self.repository.get_for_employee(employee_id)
        return await self._to_schema(list(records))

    async def get_mission_history(
        self, mission_id: int
    ) -> list[EmployeeMissionHistoryEntry]:
        """The mission's own change trail plus that of every KPI under it,
        newest first. Guarded by EMPLOYEE_MISSION_HISTORY so HRM/HRS can read it
        without CHANGE_LOG, which would expose the entire system audit trail."""
        record = await self._get_mission_or_404(mission_id)
        kpi_ids = [k.id for k in record.kpis]
        return await self.audit.get_history(mission_id=mission_id, kpi_ids=kpi_ids)

    async def get_employee_history(
        self, employee_id: int
    ) -> list[EmployeeMissionHistoryEntry]:
        """Every mission/KPI change for this employee, DELETED missions included.

        The per-mission history is unreachable once a mission is removed (its row
        is gone, so there is nothing left to click), which would make deletions
        invisible. This employee-level view is where they remain auditable.
        """
        return await self.audit.get_employee_history(employee_id)

    # ── writes ───────────────────────────────────────────────────────────────

    async def create_mission(
        self, employee_id: int, payload: EmployeeMissionCreate
    ) -> MutationResponse[EmployeeMissionSchema]:
        """Mission + its KPIs + the optional competence link, in ONE transaction.

        The mandatory-KPI rule is enforced on both ends: Pydantic rejects an empty
        `kpis` list before we get here, and EmployeeMissionKpiService refuses to
        delete the last one later. Between those two there is no window in which a
        KPI-less mission can exist.
        """
        await self.access.assert_can_manage(employee_id, OperationVerb.CREATE)
        await self._assert_employee_exists(employee_id)
        await self._validate_duration(payload.duration_months)
        await self._validate_kpi_count(len(payload.kpis))
        await self._assert_active_capacity(employee_id)
        if payload.dimension_id is not None:
            await self._assert_dimension_exists(payload.dimension_id)

        mission = self.repository.model(
            employee_id=employee_id,
            text=payload.text,
            start_date=payload.start_date,
            end_date=compute_end_date(payload.start_date, payload.duration_months),
            # A new mission has no KPI progress yet, so it always starts planned.
            status_id=await self._status_id_for_key(PLANNED),
        )
        self.session.add(mission)
        await self.session.flush()  # assign the mission PK for the children

        for index, kpi_in in enumerate(payload.kpis, start=1):
            self.session.add(
                EmployeeMissionKpi(
                    mission_id=mission.id,
                    text=kpi_in.text,
                    percent=0,
                    sort_order=index * KPI_SORT_STEP,
                )
            )
        if payload.dimension_id is not None:
            self.session.add(
                EmployeeMissionDimensionLink(
                    mission_id=mission.id,
                    dimension_id=payload.dimension_id,
                )
            )
        await self.session.flush()

        await self.audit.log_mission(
            mission_id=mission.id,
            employee_id=employee_id,
            action=ChangeAction.CREATE,
            changes={
                "text": {"old": None, "new": mission.text},
                "start_date": {"old": None, "new": str(mission.start_date)},
                "end_date": {"old": None, "new": str(mission.end_date)},
                "dimension_id": {"old": None, "new": payload.dimension_id},
            },
        )
        await self.session.commit()

        record = await self._get_mission_or_404(mission.id)
        schema = (await self._to_schema([record]))[0]
        detail = await self._resolve_domain_success(EmployeeMissionCreateSuccess())
        return MutationResponse(detail=detail, data=schema)

    async def update_mission(
        self, mission_id: int, payload: EmployeeMissionUpdate
    ) -> MutationResponse[EmployeeMissionSchema]:
        """Partial update. Touching start_date or duration_months recomputes
        end_date — the client never sends it."""
        record = await self._get_mission_or_404(mission_id)
        await self.access.assert_can_manage(record.employee_id, OperationVerb.MODIFY)

        data = payload.model_dump(exclude_unset=True)
        if not data:
            schema = (await self._to_schema([record]))[0]
            detail = await self._resolve_domain_success(EmployeeMissionUpdateSuccess())
            return MutationResponse(detail=detail, data=schema)

        # duration_months is an INPUT ONLY — it is not a column. Pull it out
        # before the generic setattr loop so nothing tries to assign it.
        duration = data.pop("duration_months", None)
        if duration is not None:
            await self._validate_duration(duration)

        changes: dict = {}
        for field, new_value in data.items():
            old_value = getattr(record, field)
            if old_value == new_value:
                continue
            setattr(record, field, new_value)
            changes[field] = {"old": str(old_value), "new": str(new_value)}

        if "start_date" in data or duration is not None:
            # Keep whichever duration the caller did not send: an unchanged
            # duration must not silently reset when only the start date moves.
            months = (
                duration
                if duration is not None
                else months_between(record.start_date, record.end_date)
            )
            old_end = record.end_date
            record.end_date = compute_end_date(record.start_date, months)
            if old_end != record.end_date:
                changes["end_date"] = {
                    "old": str(old_end),
                    "new": str(record.end_date),
                }

        if changes:
            await self.audit.log_mission(
                mission_id=record.id,
                employee_id=record.employee_id,
                action=ChangeAction.UPDATE,
                changes=changes,
            )
        await self.session.commit()

        record = await self._get_mission_or_404(mission_id)
        schema = (await self._to_schema([record]))[0]
        detail = await self._resolve_domain_success(EmployeeMissionUpdateSuccess())
        return MutationResponse(detail=detail, data=schema)

    async def revert_progress(
        self, mission_id: int
    ) -> MutationResponse[EmployeeMissionSchema]:
        """Roll every KPI back to its previous recorded percentage (admin/dev).

        Deliberately NOT a status edit. Status is derived from the KPIs, so the
        only coherent way to "undo" a status is to undo the progress that caused
        it — after which apply_status recomputes the earlier status by itself.
        Restricted to admin/dev because it rewrites an assessment of a person.
        """
        record = await self._get_mission_or_404(mission_id)
        if not self.access.is_admin_like():
            raise await self._resolve_domain_error(MissionRevertDenied())

        previous = await self.audit.previous_kpi_percents([k.id for k in record.kpis])
        if not previous:
            raise await self._resolve_domain_error(MissionNothingToRevert())

        for kpi in record.kpis:
            if kpi.id not in previous:
                continue
            old, new = kpi.percent, previous[kpi.id]
            if old == new:
                continue
            kpi.percent = new
            await self.audit.log_kpi(
                kpi_id=kpi.id,
                employee_id=record.employee_id,
                action=ChangeAction.UPDATE,
                changes={
                    "percent": {"old": old, "new": new},
                    "reverted": {"old": None, "new": True},
                },
            )
        await self.apply_status(record)
        await self.session.commit()

        record = await self._get_mission_or_404(mission_id)
        schema = (await self._to_schema([record]))[0]
        detail = await self._resolve_domain_success(MissionRevertSuccess())
        return MutationResponse(detail=detail, data=schema)

    async def delete_mission(self, mission_id: int) -> str:
        """Delete the mission; KPIs, comments and the competence link go with it
        (FK CASCADE + delete-orphan). The KPI rows are logged as CHILDREN of the
        mission's delete entry via parent_id, the same way talent_audit_job rows
        hang off an employee_event apply — so the trail explains why they went."""
        record = await self._get_mission_or_404(mission_id)
        await self.access.assert_can_manage(record.employee_id, OperationVerb.DELETE)

        employee_id = record.employee_id
        kpi_snapshot = [(k.id, k.text, k.percent) for k in record.kpis]

        parent = await self.audit.log_mission(
            mission_id=record.id,
            employee_id=employee_id,
            action=ChangeAction.DELETE,
            changes={
                "text": {"old": record.text, "new": None},
                "end_date": {"old": str(record.end_date), "new": None},
            },
        )
        for kpi_id, kpi_text, kpi_percent in kpi_snapshot:
            await self.audit.log_kpi(
                kpi_id=kpi_id,
                employee_id=employee_id,
                action=ChangeAction.DELETE,
                changes={
                    "text": {"old": kpi_text, "new": None},
                    "percent": {"old": kpi_percent, "new": None},
                },
                parent_id=parent.id,
            )

        await self.session.delete(record)
        await self.session.commit()
        return await self._resolve_domain_success(EmployeeMissionDeleteSuccess())
