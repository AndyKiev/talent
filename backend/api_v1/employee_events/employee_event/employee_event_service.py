# backend/api_v1/employee_events/employee_event/employee_event_service.py
import datetime
from typing import Optional, List

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee_events.employee_event.employee_event_repository import (
    EmployeeEventRepository,
)
from backend.api_v1.employee_events.employee_event.employee_event_schema import (
    EmployeeEventSchema,
    EmployeeEventFlat,
    EmployeeEventCreate,
    EmployeeEventUpdate,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.employee_events.employee_event.employee_event_errors import (
    EmployeeEventNotFound,
    EmployeeEventDeleteError,
    EmployeeEventAlreadyApplied,
    EmployeeEventNotDraft,
)
from backend.api_v1.employee_events.employee_event.employee_event_success import (
    EmployeeEventDeleteSuccess,
    EmployeeEventCreateSuccess,
    EmployeeEventUpdateSuccess,
    EmployeeEventApplySuccess,
)
from backend.api_v1.employee_events.employee_event_status.employee_event_status_service import (
    EmployeeEventStatusService,
)
from backend.api_v1.employee_events.employee_event_change.employee_event_change_repository import (
    EmployeeEventChangeRepository,
)
from backend.api_v1.employee_events.employee_event_change_department.employee_event_change_department_repository import (
    EmployeeEventChangeDepartmentRepository,
)
from backend.api_v1.employee.employee_repository import EmployeeRepository
from backend.api_v1.employee_department.employee_department_repository import (
    EmployeeDepartmentRepository,
)
from backend.api_v1.employee_status.employee_status_repository import (
    EmployeeStatusRepository,
)
from backend.api_v1.employee_events.employee_event_direction_type.employee_event_direction_type_repository import (
    EmployeeEventDirectionTypeRepository,
)
from backend.api_v1.employee_events.employee_event_status.employee_event_status_repository import (
    EmployeeEventStatusRepository,
)
from backend.api_v1.employee_events.employee_event_type.employee_event_type_repository import (
    EmployeeEventTypeRepository,
)
from backend.api_v1.employee_events.employee_status_transitions import (
    resolve_status_transition,
    ACTIVATION_TARGET,
    InvalidStatusTransition,
)
from backend.api_v1.employee_events.employee_event.employee_event_errors import (
    EmployeeEventInvalidStatusTransition,
    EmployeeEventOpenEventExists,
    EmployeeEventActivationExists,
    EmployeeEventActivationRequired,
    EmployeeEventDateTaken,
    EmployeeEventNotLatest,
)
from backend.api_v1.talent_audit_job.talent_audit_job_service import (
    TalentAuditJobService,
)
from backend.api_v1.talent_audit_job.talent_audit_job_repository import (
    TalentAuditJobRepository,
)
from backend.api_v1.audit.change_session.change_session_service import (
    ChangeSessionService,
)
from backend.api_v1.audit.change_session.change_session_repository import (
    ChangeSessionRepository,
)
from backend.api_v1.audit.change_session.change_session_schema import (
    ChangeSource,
    ChangeRunStatus,
)
from backend.api_v1.audit.change_log.change_log_service import ChangeLogService
from backend.api_v1.audit.change_log.change_log_repository import ChangeLogRepository
from backend.api_v1.audit.change_log.change_log_schema import ChangeAction


class EmployeeEventService(BaseService):
    # TODO(testing): set back to False once the apply flow is stable.
    # When True, applied events may be deleted (handy during development).
    ALLOW_DELETE_APPLIED = True

    # Backend-only switch (default ON): when an applied event carries a
    # JOB_CHANGE, reconcile the employee's talent-audit jobs (matched → applied,
    # lower-period open jobs → skipped). Flip to False to disable globally.
    APPLY_TALENT_AUDIT_RECONCILE = True

    def __init__(
        self,
        repository: EmployeeEventRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)
        self._employee_repo = EmployeeRepository(session=session)
        self._status_repo = EmployeeStatusRepository(session=session)
        # Talent reconcile runs on the SAME session so its in-place status
        # mutations flush within this service's apply commit.
        self._talent_audit_job_service = TalentAuditJobService(
            repository=TalentAuditJobRepository(session=session),
            user=user,
            session=session,
        )
        # Audit log services share this session so log rows + the actual
        # mutations flush together inside each apply/delete commit.
        self._change_session_service = ChangeSessionService(
            repository=ChangeSessionRepository(session=session),
            user=user,
            session=session,
        )
        self._change_log_service = ChangeLogService(
            repository=ChangeLogRepository(session=session),
            user=user,
            session=session,
        )

    # ── Status-transition application (Model A: mutate live employee row) ─────────

    async def _apply_status_transition(self, event) -> None:
        """
        On apply, mutate the employee's live projection (status, and for
        ACTIVATION also job + main department).

        - ACTIVATION genesis event: set status directly to the activation
          target (working), set job_id from JOB_CHANGE, and create the main
          department link from MAIN_DEPT_CHANGE. Bypasses the SM for status.
        - All other events: run (current_status -> target_status) through the
          SM; illegal transitions raise a domain error and abort the apply.

        Job / main-department application for NON-activation events
        (transfer, promotion, etc.) is deferred to a later batch (b1 scope).
        """
        # Capture the id BEFORE expiring (accessing attributes on an expired
        # instance triggers a sync lazy-reload -> MissingGreenlet).
        event_id = event.id
        # Re-read the event fresh so changes + their direction_type/new_* are
        # fully selectin-loaded (the passed-in instance may be stale).
        self.session.expire_all()
        event = await self.repository.get_by_id(event_id)
        if not event:
            return

        event_code = event.event_type.code if event.event_type else None
        employee = await self._employee_repo.get_by_id(event.employee_id)
        if not employee:
            return

        # Index the event's change rows by direction code
        changes_by_code: dict[str, object] = {}
        for change in event.changes or []:
            code = change.direction_type.code if change.direction_type else None
            if code:
                changes_by_code[code] = change

        # ── ACTIVATION: write the full initial projection in one shot ─────────
        if event_code == "ACTIVATION":
            # Status -> working (genesis, bypass SM)
            target_status = await self._status_repo.get_by_field(
                "name", ACTIVATION_TARGET
            )
            if target_status:
                employee.status_id = target_status.id

            # Job from JOB_CHANGE
            job_change = changes_by_code.get("JOB_CHANGE")
            if job_change is not None and job_change.new_job_id is not None:
                employee.job_id = job_change.new_job_id

            # Main department from MAIN_DEPT_CHANGE -> create is_main link
            dept_change = changes_by_code.get("MAIN_DEPT_CHANGE")
            if dept_change is not None and dept_change.new_department_id is not None:
                dept_repo = EmployeeDepartmentRepository(session=self.session)
                existing_main = await dept_repo.get_main_by_employee(employee.id)
                if existing_main is None:
                    await dept_repo.create_from_dict(
                        {
                            "employee_id": employee.id,
                            "department_id": dept_change.new_department_id,
                            "is_main": True,
                        }
                    )

            # Responsibility departments from RESPONSIBILITY_DEPTS_CHANGE
            await self._apply_responsibility_depts(
                employee.id, changes_by_code.get("RESPONSIBILITY_DEPTS_CHANGE")
            )

            await self.session.commit()
            return

        # ── Non-activation events (direction-driven) ──────────────────────────
        dept_repo = EmployeeDepartmentRepository(session=self.session)

        # JOB_CHANGE -> update employee.job_id (TRANSFER, PROMOTION, ...)
        job_change = changes_by_code.get("JOB_CHANGE")
        if job_change is not None and job_change.new_job_id is not None:
            employee.job_id = job_change.new_job_id

        # MAIN_DEPT_CHANGE -> UPDATE the existing is_main link in place
        # (TRANSFER). Also clear responsibility links, since the responsibility
        # scope belonged to the old position (new HRM reassigns later).
        dept_change = changes_by_code.get("MAIN_DEPT_CHANGE")
        if dept_change is not None and dept_change.new_department_id is not None:
            # Delete all responsibility (is_main=False) links on transfer.
            existing = await dept_repo.get_by_employee(employee.id)
            for link in existing:
                if not link.is_main:
                    await dept_repo.delete_by_id(link.id)

            existing_main = await dept_repo.get_main_by_employee(employee.id)
            if existing_main is not None:
                # Update the existing main link to the new department.
                existing_main.department_id = dept_change.new_department_id
            else:
                await dept_repo.create_from_dict(
                    {
                        "employee_id": employee.id,
                        "department_id": dept_change.new_department_id,
                        "is_main": True,
                    }
                )

        # RESPONSIBILITY_DEPTS_CHANGE -> add responsibility links
        await self._apply_responsibility_depts(
            employee.id, changes_by_code.get("RESPONSIBILITY_DEPTS_CHANGE")
        )

        # STATUS_CHANGE -> run through the state machine (leave/return/dismissal)
        status_change = changes_by_code.get("STATUS_CHANGE")
        if status_change is None or status_change.new_status_id is None:
            await self.session.commit()
            return

        target_status = await self._status_repo.get_by_id(status_change.new_status_id)
        if not target_status:
            await self.session.commit()
            return

        current_status = employee.status  # selectin-loaded
        current_name = current_status.name if current_status else None
        if not current_name:
            await self.session.commit()
            return

        try:
            new_name = resolve_status_transition(
                current_name, target_status.name, employee_id=employee.id
            )
        except InvalidStatusTransition as exc:
            raise await self._resolve_domain_error(
                EmployeeEventInvalidStatusTransition(exc.current, exc.target, event.id)
            ) from exc

        new_status = await self._status_repo.get_by_field("name", new_name)
        if new_status:
            employee.status_id = new_status.id
        await self.session.commit()

    async def _apply_responsibility_depts(self, employee_id: int, resp_change) -> None:
        """
        Create is_main=False employee_departments rows for each dept_change
        on a RESPONSIBILITY_DEPTS_CHANGE row. Skips departments the employee
        is already linked to (idempotent). Does NOT commit — the caller commits.
        """
        if resp_change is None:
            return

        # Re-fetch the dept_changes directly from their repository rather than
        # relying on the (possibly stale) selectin relationship on resp_change.
        from backend.api_v1.employee_events.employee_event_change_department.employee_event_change_department_repository import (
            EmployeeEventChangeDepartmentRepository,
        )

        dept_change_repo = EmployeeEventChangeDepartmentRepository(session=self.session)
        dept_changes = await dept_change_repo.get_all(
            filters={"event_change_id": resp_change.id}
        )
        if not dept_changes:
            return

        dept_repo = EmployeeDepartmentRepository(session=self.session)
        existing = await dept_repo.get_by_employee(employee_id)

        # REPLACE semantics: delete all current responsibility (is_main=False)
        # links, then insert only the ones in this event. Keeps the employee's
        # responsibility set equal to the latest event's selection.
        for link in existing:
            if not link.is_main:
                await dept_repo.delete_by_id(link.id)

        target_dept_ids = {dc.department_id for dc in dept_changes}
        for dept_id in target_dept_ids:
            await dept_repo.create_from_dict(
                {
                    "employee_id": employee_id,
                    "department_id": dept_id,
                    "is_main": False,
                }
            )

    # Event-type code -> auto status name (HRM never picks these).
    AUTO_STATUS_BY_EVENT_CODE = {
        "ACTIVATION": "working",
        "RETURN": "working",
        "DISMISSAL": "dismissed",
    }

    async def _maybe_autocreate_status_change(self, event) -> None:
        """
        For event types whose status is fixed by business rule
        (ACTIVATION/RETURN -> working, DISMISSAL -> dismissed), create the
        STATUS_CHANGE row automatically so the HRM never selects it.
        Does nothing for other event types (e.g. TEMPORARY_LEAVE), where the
        HRM picks the status.
        """
        event_code = event.event_type.code if event.event_type else None
        target_name = self.AUTO_STATUS_BY_EVENT_CODE.get(event_code or "")
        if not target_name:
            return

        # Resolve the STATUS_CHANGE direction type id
        dir_repo = EmployeeEventDirectionTypeRepository(session=self.session)
        status_dir = await dir_repo.get_by_field("code", "STATUS_CHANGE")
        if not status_dir:
            return

        target_status = await self._status_repo.get_by_field("name", target_name)
        if not target_status:
            return

        change_repo = EmployeeEventChangeRepository(session=self.session)
        await change_repo.create_from_dict(
            {
                "event_id": event.id,
                "direction_type_id": status_dir.id,
                "new_status_id": target_status.id,
            }
        )

    async def _sync_event_status(self, event_id: int) -> None:
        """
        Recompute draft/ready based on whether all REQUIRED directions of the
        event's type have a corresponding change row. Mirrors the same helper
        in EmployeeEventChangeService so both create-time and change-time edits
        keep the status in sync. Applied events are never touched.
        """
        # Expire cached ORM objects so the re-read picks up any
        # just-committed change rows (e.g. auto-created during activation).
        self.session.expire_all()

        event = await self.repository.get_by_id(event_id)
        if not event or not event.status:
            return
        if event.status.name not in ("draft", "ready"):
            return

        required_ids = {
            td.direction_type_id
            for td in (event.event_type.type_directions if event.event_type else [])
            if td.is_required
        }
        filled_ids = {c.direction_type_id for c in (event.changes or [])}

        target_name = "ready" if required_ids.issubset(filled_ids) else "draft"
        if event.status.name == target_name:
            return

        status_repo = EmployeeEventStatusRepository(session=self.session)
        target_status = await status_repo.get_by_field("name", target_name)
        if not target_status:
            return
        event.status_id = target_status.id
        await self.session.commit()

    # ── Orchestration: create activation for a new employee ───────────────────

    async def create_activation_for_employee(
        self,
        employee_id: int,
        effective_date,
        department_id: int,
        job_id: int,
        description: str | None = None,
    ) -> EmployeeEventSchema:
        """
        Create a full ACTIVATION event for a newly-created (pending) employee.
        This is the backend half of 'POST /employees/with_activation'.

        Steps:
          0. Set employee status to 'pending' (override model default).
          1. Look up the ACTIVATION event type and draft status.
          2. Create the event header.
          3. Auto-create the STATUS_CHANGE -> working (via _maybe_autocreate_status_change).
          4. Create MAIN_DEPT_CHANGE + JOB_CHANGE change rows.
          5. Sync status -> ready (all required directions filled).
          6. Return the event schema.
        """
        from datetime import date as date_type

        # Defensive: ensure effective_date is a date object, not a string.
        if isinstance(effective_date, str):
            effective_date = date_type.fromisoformat(effective_date)

        # 0) Set employee to pending status (create_user uses model default=working)
        employee = await self._employee_repo.get_by_id(employee_id)
        if employee:
            pending = await self._status_repo.get_by_field("name", "pending")
            if pending:
                employee.status_id = pending.id
                employee.job_id = None  # pending employee has no job yet
                await self.session.commit()
        # Resolve ACTIVATION type and draft status
        type_repo = EmployeeEventTypeRepository(session=self.session)
        activation_type = await type_repo.get_by_field("code", "ACTIVATION")
        if not activation_type:
            raise ValueError("ACTIVATION event type not found in DB")

        status_repo = EmployeeEventStatusRepository(session=self.session)
        draft_status = await status_repo.get_by_field("name", "draft")
        if not draft_status:
            raise ValueError("draft event status not found in DB")

        # Create event header
        orm_event = await self.create_from_dict(
            {
                "employee_id": employee_id,
                "event_type_id": activation_type.id,
                "status_id": draft_status.id,
                "effective_date": effective_date,
                "description": description,
                "created_by": self.user.id,
            }
        )

        # Auto-create STATUS_CHANGE -> working
        await self._maybe_autocreate_status_change(orm_event)

        # Create MAIN_DEPT_CHANGE
        dir_repo = EmployeeEventDirectionTypeRepository(session=self.session)
        change_repo = EmployeeEventChangeRepository(session=self.session)

        main_dept_dir = await dir_repo.get_by_field("code", "MAIN_DEPT_CHANGE")
        if main_dept_dir:
            await change_repo.create_from_dict(
                {
                    "event_id": orm_event.id,
                    "direction_type_id": main_dept_dir.id,
                    "new_department_id": department_id,
                }
            )

        # Create JOB_CHANGE
        job_dir = await dir_repo.get_by_field("code", "JOB_CHANGE")
        if job_dir:
            await change_repo.create_from_dict(
                {
                    "event_id": orm_event.id,
                    "direction_type_id": job_dir.id,
                    "new_job_id": job_id,
                }
            )

        # All required directions filled -> flip to ready
        await self._sync_event_status(orm_event.id)

        # Return the fully-loaded event
        fresh = await self.get_by_id(orm_event.id)
        return EmployeeEventSchema.model_validate(fresh)

    async def get_by_id(self, event_id: int) -> EmployeeEventSchema:
        result = await self.repository.get_by_id(event_id)
        if not result:
            raise await self._resolve_domain_error(EmployeeEventNotFound(event_id))
        return result

    async def get_employee_events(
        self,
        employee_id: int,
        sort: Optional[str] = None,
    ) -> List[EmployeeEventFlat]:
        records = await self.repository.get_all(
            filters={"employee_id": employee_id},
            sort=sort,
        )
        return [EmployeeEventFlat.model_validate(r) for r in records]

    async def get_responsibility_history(self, employee_id: int) -> list[dict]:
        """
        Flat history of responsibility-department assignments for an employee.
        Reads applied events that carry a RESPONSIBILITY_DEPTS_CHANGE row and
        returns, per event, its effective_date, event type, and the departments
        set by that event. Latest first.

        Option (b): derived from event history, no schema change.
        """
        events = await self.repository.get_all(filters={"employee_id": employee_id})

        history: list[dict] = []
        for ev in events:
            # Only applied events represent realized assignments.
            status_name = ev.status.name if ev.status else None
            if status_name != "applied":
                continue

            for change in ev.changes or []:
                code = change.direction_type.code if change.direction_type else None
                if code != "RESPONSIBILITY_DEPTS_CHANGE":
                    continue
                depts = [
                    {
                        "id": dc.department_id,
                        "name": dc.department.name if dc.department else None,
                    }
                    for dc in (change.dept_changes or [])
                ]
                history.append(
                    {
                        "effective_date": ev.effective_date,
                        "event_type": ev.event_type.name if ev.event_type else None,
                        "event_type_code": (
                            ev.event_type.code if ev.event_type else None
                        ),
                        "departments": depts,
                    }
                )

        history.sort(key=lambda h: h["effective_date"] or "", reverse=True)
        return history

    OPEN_STATUSES = ("draft", "ready")
    ACTIVATION_CODE = "ACTIVATION"

    async def _assert_can_create_event(
        self, employee_id: int, event_type_id: int, effective_date=None
    ) -> None:
        """
        Enforce the single-open-event + activation-first + unique-date invariants:

        1. At most ONE non-applied (draft/ready) event per employee. To add a
           new event, the current open one must be applied first.
        2. ACTIVATION must be the employee's first event, and may exist once.
           - Adding ACTIVATION when any event already exists -> error.
           - Adding a non-ACTIVATION event when NO event exists yet -> error
             (activation must come first).
        3. No two events for the same employee may share an effective_date.
        """
        existing = await self.repository.get_all(filters={"employee_id": employee_id})

        # (1) one open event at a time
        open_events = [
            e for e in existing if e.status and e.status.name in self.OPEN_STATUSES
        ]
        if open_events:
            raise await self._resolve_domain_error(
                EmployeeEventOpenEventExists(employee_id)
            )

        # Resolve the requested event type's code
        type_repo = EmployeeEventTypeRepository(session=self.session)
        event_type = await type_repo.get_by_id(event_type_id)
        is_activation = bool(event_type and event_type.code == self.ACTIVATION_CODE)

        if is_activation:
            # (2) activation may exist only once
            if existing:
                raise await self._resolve_domain_error(
                    EmployeeEventActivationExists(employee_id)
                )
        else:
            # (2) activation must come first
            if not existing:
                raise await self._resolve_domain_error(
                    EmployeeEventActivationRequired(employee_id)
                )

        # (3) effective_date must be unique per employee
        if effective_date is not None and any(
            e.effective_date == effective_date for e in existing
        ):
            raise await self._resolve_domain_error(
                EmployeeEventDateTaken(employee_id, effective_date)
            )

    @staticmethod
    def _json_value(value):
        """Make a column value JSON-safe for the change_log `changes` field."""
        if isinstance(value, (datetime.date, datetime.datetime)):
            return value.isoformat()
        return value

    async def create_employee_event(
        self,
        employee_id: int,
        event_in: EmployeeEventCreate,
    ) -> MutationResponse[EmployeeEventSchema]:
        """
        Creates the event header and all provided change rows in one transaction.
        `employee_id` is injected from the URL path.
        `created_by` is injected from the authenticated session user.
        """
        # Guards FIRST — a rejected create should not open an audit run.
        await self._assert_can_create_event(
            employee_id, event_in.event_type_id, event_in.effective_date
        )

        run = await self._change_session_service.start_session(
            source=ChangeSource.MANUAL,
            triggered_by_user_id=(self.user.id if self.user else None),
            task_name="create_employee_event",
            employee_id=employee_id,
            commit=True,
        )
        run_id = run.id

        try:
            # ── Event header ──────────────────────────────────────────────────
            event_data = event_in.model_dump(exclude={"changes"})
            event_data["employee_id"] = employee_id
            event_data["created_by"] = self.user.id
            orm_event = await self.create_from_dict(event_data)
            new_event_id = orm_event.id  # capture before any expire/commit churn

            # ── Auto-create the STATUS_CHANGE row for code-mapped event types ──
            # ACTIVATION / RETURN -> working ; DISMISSAL -> dismissed.
            # The HRM never picks status for these (hidden in the drawer).
            await self._maybe_autocreate_status_change(orm_event)

            # ── Change rows (use their own repositories) ──────────────────────
            if event_in.changes:
                change_repo = EmployeeEventChangeRepository(session=self.session)
                dept_repo = EmployeeEventChangeDepartmentRepository(
                    session=self.session
                )
                for change_in in event_in.changes:
                    change_data = change_in.model_dump(exclude={"dept_changes"})
                    change_data["event_id"] = new_event_id
                    orm_change = await change_repo.create_from_dict(change_data)

                    for dept_in in change_in.dept_changes:
                        dept_data = dept_in.model_dump()
                        dept_data["event_change_id"] = orm_change.id
                        await dept_repo.create_from_dict(dept_data)

            # Recompute draft/ready now that any auto/explicit changes exist.
            await self._sync_event_status(new_event_id)

            # Re-fetch so all nested selectin relationships load cleanly
            # (avoids MissingGreenlet on event_type.type_directions etc.).
            fresh = await self.get_by_id(new_event_id)

            # Audit: record the creation (snapshot of key fields).
            create_labels = await self._event_change_labels(new_event_id)
            await self._change_log_service.log(
                change_session_id=run_id,
                essence_key="employee_event",
                action=ChangeAction.CREATE,
                entity_id=new_event_id,
                employee_id=employee_id,
                changes={
                    "status_id": {"old": None, "new": fresh.status_id},
                    "event_type_id": {"old": None, "new": fresh.event_type_id},
                    "effective_date": {
                        "old": None,
                        "new": self._json_value(fresh.effective_date),
                    },
                    **create_labels,
                },
            )
            await self._change_session_service.finish_session(
                run_id, ChangeRunStatus.SUCCESS, commit=True
            )

            schema = EmployeeEventSchema.model_validate(fresh)
            detail = await self._resolve_domain_success(
                EmployeeEventCreateSuccess(schema.id)
            )
            return MutationResponse(detail=detail, data=schema)

        except IntegrityError as exc:
            await self.session.rollback()
            await self._change_session_service.finish_session(
                run_id, ChangeRunStatus.FAILED, commit=True
            )
            raise await self._resolve_domain_error(EmployeeEventNotFound(0)) from exc
        except Exception:
            await self.session.rollback()
            await self._change_session_service.finish_session(
                run_id, ChangeRunStatus.FAILED, commit=True
            )
            raise

    async def update_employee_event(
        self,
        event_id: int,
        event_update: EmployeeEventUpdate,
    ) -> MutationResponse[EmployeeEventSchema]:
        orm_record = await self.get_by_id(event_id)

        # Guard: only draft events may be patched
        if orm_record.status and orm_record.status.name != "draft":
            raise await self._resolve_domain_error(EmployeeEventNotDraft(event_id))

        # Capture old values of the fields being changed BEFORE the update
        # (and before any expire), for the audit diff.
        update_fields = event_update.model_dump(exclude_unset=True)
        old_values = {f: getattr(orm_record, f, None) for f in update_fields}
        employee_id = orm_record.employee_id

        run = await self._change_session_service.start_session(
            source=ChangeSource.MANUAL,
            triggered_by_user_id=(self.user.id if self.user else None),
            task_name="update_employee_event",
            employee_id=employee_id,
            commit=True,
        )
        run_id = run.id

        try:
            await self.update(orm_record, event_update, partial=True)

            changes = {
                f: {
                    "old": self._json_value(old_values.get(f)),
                    "new": self._json_value(update_fields[f]),
                }
                for f in update_fields
            }
            await self._change_log_service.log(
                change_session_id=run_id,
                essence_key="employee_event",
                action=ChangeAction.UPDATE,
                entity_id=event_id,
                employee_id=employee_id,
                changes=changes or None,
            )
            await self._change_session_service.finish_session(
                run_id, ChangeRunStatus.SUCCESS, commit=True
            )
        except Exception:
            await self.session.rollback()
            await self._change_session_service.finish_session(
                run_id, ChangeRunStatus.FAILED, commit=True
            )
            raise

        # Re-fetch so all nested selectin relationships load cleanly
        # (avoids MissingGreenlet on changes.*.new_job / dept_changes).
        fresh = await self.get_by_id(event_id)
        schema = EmployeeEventSchema.model_validate(fresh)
        detail = await self._resolve_domain_success(
            EmployeeEventUpdateSuccess(schema.id)
        )
        return MutationResponse(detail=detail, data=schema)

    async def _extract_job_change_job_id(self, event_id: int) -> Optional[int]:
        """
        Return the new_job_id of this event's JOB_CHANGE change row, or None if
        the event has no job change. Re-fetches fresh so changes + direction_type
        are selectin-loaded (the apply flow calls session.expire_all()).
        """
        event = await self.repository.get_by_id(event_id)
        if not event:
            return None
        for change in event.changes or []:
            code = change.direction_type.code if change.direction_type else None
            if code == "JOB_CHANGE" and change.new_job_id is not None:
                return change.new_job_id
        return None

    async def _event_change_labels(self, event_id: int) -> dict:
        """
        Human-readable job / main-department change for an event, for the audit
        log. Returns a partial changes-map merged into the logged `changes`, e.g.
          {"job": {"old": "Junior", "new": "Senior"},
           "mainDepartment": {"old": "Store A", "new": "Store B"}}
        Re-fetches fresh so the change rows + their job/department relations are
        selectin-loaded (apply/reproject call session.expire_all()).
        """
        event = await self.repository.get_by_id(event_id)
        labels: dict = {}
        for change in (event.changes or []) if event else []:
            code = change.direction_type.code if change.direction_type else None
            if code == "JOB_CHANGE":
                labels["job"] = {
                    "old": change.prev_job.name if change.prev_job else None,
                    "new": change.new_job.name if change.new_job else None,
                }
            elif code == "MAIN_DEPT_CHANGE":
                labels["mainDepartment"] = {
                    "old": (
                        change.prev_department.name if change.prev_department else None
                    ),
                    "new": (
                        change.new_department.name if change.new_department else None
                    ),
                }
        return labels

    async def apply_employee_event(
        self,
        event_id: int,
        applied_status_id: int,
        change_session_id: Optional[int] = None,
    ) -> MutationResponse[EmployeeEventSchema]:
        """
        Transitions the event from `draft` to `applied` by updating `status_id`,
        recording the change in the audit log.

        `change_session_id`:
          - None  → standalone (manual single apply): opens its own `manual`
            audit run (actor = self.user) and finishes it here.
          - given → part of a bulk/celery run: logs under the caller's run and
            leaves opening/finishing to the caller.
        """
        orm_record = await self.get_by_id(event_id)

        if orm_record.status and orm_record.status.name == "applied":
            raise await self._resolve_domain_error(
                EmployeeEventAlreadyApplied(event_id)
            )

        # Capture before _apply_status_transition expires the session (accessing
        # attributes on the expired instance would trigger a sync lazy-reload).
        employee_id = orm_record.employee_id
        prev_status_id = orm_record.status_id

        owns_session = change_session_id is None
        if owns_session:
            run = await self._change_session_service.start_session(
                source=ChangeSource.MANUAL,
                triggered_by_user_id=(self.user.id if self.user else None),
                employee_id=employee_id,
                commit=True,
            )
            change_session_id = run.id

        try:
            # Apply the employee status transition FIRST (Model A). If it is
            # illegal, this raises and the event is left unchanged (not applied).
            await self._apply_status_transition(orm_record)

            # Log the apply itself; this entry is the parent of any cascaded
            # talent-audit-job changes, so a future delete can reverse them.
            change_labels = await self._event_change_labels(event_id)
            apply_entry = await self._change_log_service.log(
                change_session_id=change_session_id,
                essence_key="employee_event",
                action=ChangeAction.APPLY,
                entity_id=event_id,
                employee_id=employee_id,
                changes={
                    "status_id": {"old": prev_status_id, "new": applied_status_id},
                    **change_labels,
                },
            )

            # Talent-audit reconcile: only when this event carries a JOB_CHANGE.
            # Mutates audit-job statuses in place; we log each change under the
            # apply entry. The commit below flushes everything together.
            if self.APPLY_TALENT_AUDIT_RECONCILE:
                applied_job_id = await self._extract_job_change_job_id(event_id)
                if applied_job_id is not None:
                    reconcile = await self._talent_audit_job_service.reconcile_after_job_applied(
                        employee_id=employee_id,
                        applied_job_id=applied_job_id,
                    )
                    for c in reconcile.get("changes", []):
                        await self._change_log_service.log(
                            change_session_id=change_session_id,
                            essence_key="talent_audit_job",
                            action=ChangeAction.STATUS_CHANGE,
                            entity_id=c["talent_audit_job_id"],
                            changes={
                                "status_id": {
                                    "old": c["old_status_id"],
                                    "new": c["new_status_id"],
                                },
                                "status_key": {
                                    "old": c["old_status_key"],
                                    "new": c["new_status_key"],
                                },
                            },
                            parent_id=apply_entry.id,
                        )

            await self.update(
                orm_record,
                EmployeeEventUpdate(status_id=applied_status_id),
                partial=True,
            )
        except Exception:
            # Standalone runs own their transaction + audit row: undo the work
            # and mark the run failed. Bulk/celery callers handle their own
            # rollback and run status.
            if owns_session:
                await self.session.rollback()
                await self._change_session_service.finish_session(
                    change_session_id, ChangeRunStatus.FAILED, commit=True
                )
            raise

        if owns_session:
            await self._change_session_service.finish_session(
                change_session_id, ChangeRunStatus.SUCCESS, commit=True
            )

        # Re-fetch so all nested selectin relationships load cleanly
        # (avoids MissingGreenlet on changes.*.new_job / dept_changes).
        fresh = await self.get_by_id(event_id)
        schema = EmployeeEventSchema.model_validate(fresh)
        detail = await self._resolve_domain_success(
            EmployeeEventApplySuccess(schema.id)
        )
        return MutationResponse(detail=detail, data=schema)

    async def apply_due_events(
        self,
        on_or_before: Optional[datetime.date] = None,
        change_session_id: Optional[int] = None,
    ) -> dict:
        """
        Scheduler entry point. Auto-applies every `ready` event whose
        effective_date is on or before `on_or_before` (defaults to today),
        moving each to `applied`.

        `change_session_id`:
          - None  → manual bulk (the /events/apply_due button): opens its own
            `manual` audit run (actor = self.user) and finishes it here.
          - given → celery: logs under the run the loader created/finishes.

        Per-event errors (illegal status transition, etc.) are caught so a
        single bad event never blocks the rest of the sweep; failures are
        collected and returned for the caller (loader) to log/email.

        Returns a stats dict:
          {
            "checked": int,            # ready+due events found
            "applied": int,            # successfully applied
            "failed": int,             # skipped due to error
            "applied_ids": [int, ...],
            "failures": [{"event_id": int, "employee_id": int, "error": str}],
          }
        """
        if on_or_before is None:
            on_or_before = datetime.date.today()

        owns_session = change_session_id is None
        if owns_session:
            run = await self._change_session_service.start_session(
                source=ChangeSource.MANUAL,
                triggered_by_user_id=(self.user.id if self.user else None),
                task_name="apply_due_events",
                commit=True,
            )
            change_session_id = run.id

        # Resolve the `applied` status id once (reused by apply_employee_event).
        status_repo = EmployeeEventStatusRepository(session=self.session)
        applied_status_id = await status_repo.get_id_by_field("name", "applied")
        if applied_status_id is None:
            raise ValueError("'applied' employee_event_status not found in DB")

        due_events = await self.repository.get_due_ready_events(on_or_before)

        stats = {
            "checked": len(due_events),
            "applied": 0,
            "failed": 0,
            "applied_ids": [],
            "failures": [],
        }

        # Capture ids up front — applying an event expires/refreshes ORM state.
        due_pairs = [(e.id, e.employee_id) for e in due_events]

        for event_id, employee_id in due_pairs:
            try:
                await self.apply_employee_event(
                    event_id, applied_status_id, change_session_id=change_session_id
                )
                stats["applied"] += 1
                stats["applied_ids"].append(event_id)
            except Exception as exc:  # noqa: BLE001 — keep sweeping
                # Roll back the failed unit of work so the session stays usable
                # for the next event in the loop. The run row was committed up
                # front, so it survives this rollback.
                await self.session.rollback()
                stats["failed"] += 1
                stats["failures"].append(
                    {
                        "event_id": event_id,
                        "employee_id": employee_id,
                        "error": f"{type(exc).__name__}: {exc}",
                    }
                )

        if owns_session:
            outcome = (
                ChangeRunStatus.FAILED if stats["failed"] else ChangeRunStatus.SUCCESS
            )
            await self._change_session_service.finish_session(
                change_session_id, outcome, summary=stats, commit=True
            )

        return stats

    async def delete_employee_event(self, event_id: int) -> None:
        orm_record = await self.get_by_id(event_id)

        # Guard: only draft events may be deleted (relaxed during testing)
        if not self.ALLOW_DELETE_APPLIED:
            if orm_record.status and orm_record.status.name != "draft":
                raise await self._resolve_domain_error(EmployeeEventNotDraft(event_id))

        employee_id = orm_record.employee_id

        # Guard: only the LATEST event (by effective_date, then id) may be
        # deleted — state can only be unwound from the most recent change back.
        events = await self.repository.get_all(filters={"employee_id": employee_id})
        latest = max(events, key=lambda e: (e.effective_date, e.id), default=None)
        if latest is not None and latest.id != event_id:
            raise await self._resolve_domain_error(EmployeeEventNotLatest(event_id))

        # Open a manual audit run for the deletion + any talent reversals.
        run = await self._change_session_service.start_session(
            source=ChangeSource.MANUAL,
            triggered_by_user_id=(self.user.id if self.user else None),
            employee_id=employee_id,
            commit=True,
        )
        # Capture as a plain int: _reproject_employee_projection calls
        # session.expire_all(), after which accessing run.id would trigger a
        # sync lazy-reload (MissingGreenlet) in this async context.
        run_id = run.id

        try:
            # Unwind the live projection (job + main department) by replaying the
            # events that REMAIN after this deletion. apply() mutated those
            # tables; delete must restore them. Done BEFORE delete_by_id, which
            # raises an HTTP 200 on success (so nothing after that call runs).
            await self._reproject_employee_projection(
                employee_id, exclude_event_id=event_id
            )

            # Record the deletion (parent of the talent reversal entries).
            delete_labels = await self._event_change_labels(event_id)
            delete_entry = await self._change_log_service.log(
                change_session_id=run_id,
                essence_key="employee_event",
                action=ChangeAction.DELETE,
                entity_id=event_id,
                employee_id=employee_id,
                changes=delete_labels or None,
            )

            # Restore talent-audit-job statuses that THIS event's apply changed.
            await self._restore_talent_for_event(
                event_id=event_id,
                change_session_id=run_id,
                parent_log_id=delete_entry.id,
            )

            # Finish the run BEFORE delete_by_id (which raises on success).
            await self._change_session_service.finish_session(
                run_id, ChangeRunStatus.SUCCESS, commit=True
            )
        except Exception:
            await self.session.rollback()
            await self._change_session_service.finish_session(
                run_id, ChangeRunStatus.FAILED, commit=True
            )
            raise

        await self.delete_by_id(
            event_id,
            name=event_id,
            delete_error_exc=EmployeeEventDeleteError,
            delete_success_exc=EmployeeEventDeleteSuccess,
        )

    async def revert_employee_event(
        self,
        event_id: int,
    ) -> MutationResponse[EmployeeEventSchema]:
        """
        Step the event's status one stage BACKWARD: applied -> ready -> draft.
        Only the LATEST event may be reverted (same rule as delete).

        Side effects mirror delete's unwind, but the event row is KEPT:
          • applied -> ready : un-apply — reproject job + main department
            (excluding this now-unapplied event) and restore the talent-audit-job
            statuses this event's apply changed. The employee status is left
            untouched, exactly like delete.
          • ready -> draft   : pure status change, no side effects.
          • draft            : nothing to revert -> error.
        """
        orm_record = await self.get_by_id(event_id)
        employee_id = orm_record.employee_id

        # Capture before any expire (reproject calls session.expire_all()).
        current_status_id = orm_record.status_id
        current_status_name = orm_record.status.name if orm_record.status else None

        # Guard: only the LATEST event (by effective_date, then id) may revert.
        events = await self.repository.get_all(filters={"employee_id": employee_id})
        latest = max(events, key=lambda e: (e.effective_date, e.id), default=None)
        if latest is not None and latest.id != event_id:
            raise await self._resolve_domain_error(EmployeeEventNotLatest(event_id))

        # Backward step machine: applied -> ready -> draft.
        revert_back = {"applied": "ready", "ready": "draft"}
        target_name = revert_back.get(current_status_name or "")
        if target_name is None:
            await self._raise_error(
                "employeeEventCannotRevert",
                variables={"status": current_status_name or ""},
                fallback="This event cannot be reverted further.",
            )

        status_repo = EmployeeEventStatusRepository(session=self.session)
        target_status_id = await status_repo.get_id_by_field("name", target_name)
        if target_status_id is None:
            raise ValueError(f"'{target_name}' employee_event_status not found in DB")

        was_applied = current_status_name == "applied"

        run = await self._change_session_service.start_session(
            source=ChangeSource.MANUAL,
            triggered_by_user_id=(self.user.id if self.user else None),
            task_name="revert_employee_event",
            employee_id=employee_id,
            commit=True,
        )
        # Plain int — _reproject_employee_projection calls session.expire_all().
        run_id = run.id

        try:
            # Un-applying (applied -> ready) undoes the apply's side effects.
            if was_applied:
                # Reproject job + main dept from the events that remain APPLIED
                # (this event, now un-applied, is excluded — identical to delete).
                await self._reproject_employee_projection(
                    employee_id, exclude_event_id=event_id
                )

            # Record the revert (parent of any talent reversal entries).
            revert_labels = await self._event_change_labels(event_id)
            revert_entry = await self._change_log_service.log(
                change_session_id=run_id,
                essence_key="employee_event",
                action=ChangeAction.REVERT,
                entity_id=event_id,
                employee_id=employee_id,
                changes={
                    "status_id": {
                        "old": current_status_id,
                        "new": target_status_id,
                    },
                    "status_name": {"old": current_status_name, "new": target_name},
                    **revert_labels,
                },
            )

            # Restore talent-audit-job statuses this event's apply changed
            # (reuses delete's helper — same mutations).
            if was_applied:
                await self._restore_talent_for_event(
                    event_id=event_id,
                    change_session_id=run_id,
                    parent_log_id=revert_entry.id,
                )

            # Step the event status backward.
            await self.update(
                orm_record,
                EmployeeEventUpdate(status_id=target_status_id),
                partial=True,
            )

            await self._change_session_service.finish_session(
                run_id, ChangeRunStatus.SUCCESS, commit=True
            )
        except Exception:
            await self.session.rollback()
            await self._change_session_service.finish_session(
                run_id, ChangeRunStatus.FAILED, commit=True
            )
            raise

        fresh = await self.get_by_id(event_id)
        schema = EmployeeEventSchema.model_validate(fresh)
        detail = await self._translate(
            "employeeEventRevertSuccess",
            {"id": schema.id, "status": target_name},
            fallback=f"Event reverted to '{target_name}'.",
        )
        return MutationResponse(detail=detail, data=schema)

    async def _restore_talent_for_event(
        self,
        event_id: int,
        change_session_id: int,
        parent_log_id: int,
    ) -> None:
        """
        Reverse the talent-audit-job status changes that this event's apply
        caused: find the event's `apply` log entry, read its talent_audit_job
        children, and restore each job's prior status_id from the recorded
        `changes.status_id.old`. Each restore is itself logged.

        Shared by delete (event removed) and revert (applied -> ready).

        No-op when the event predates audit logging (no apply entry) or had no
        talent changes (no children).
        """
        apply_entry = await self._change_log_service.get_apply_entry(
            essence_key="employee_event", entity_id=event_id
        )
        if apply_entry is None:
            return

        children = await self._change_log_service.get_logs(
            parent_id=apply_entry.id, essence_key="talent_audit_job"
        )
        if not children:
            return

        taj_repo = self._talent_audit_job_service.repository
        for child in children:
            changes = child.changes or {}
            status_block = changes.get("status_id") or {}
            old_status_id = status_block.get("old")
            if child.entity_id is None or old_status_id is None:
                continue
            job = await taj_repo.get_by_id(child.entity_id)
            if job is None:
                continue
            current_status_id = job.status_id
            if current_status_id == old_status_id:
                continue  # already at the prior status; nothing to undo
            job.status_id = old_status_id
            await self._change_log_service.log(
                change_session_id=change_session_id,
                essence_key="talent_audit_job",
                action=ChangeAction.STATUS_CHANGE,
                entity_id=job.id,
                changes={"status_id": {"old": current_status_id, "new": old_status_id}},
                parent_id=parent_log_id,
            )

    async def _reproject_employee_projection(
        self, employee_id: int, exclude_event_id: Optional[int] = None
    ) -> None:
        """
        Recompute and write back the employee's live projection — job_id and the
        is_main department link — by replaying all APPLIED events in
        effective_date order, ignoring `exclude_event_id` (the one being deleted).

        Mirrors the job/department writes in _apply_status_transition:
          - job_id := new_job_id of the LAST applied JOB_CHANGE (else None)
          - main department := new_department_id of the LAST applied
            MAIN_DEPT_CHANGE (else the is_main link is removed entirely)

        Responsibility (is_main=False) links are out of scope (none set yet) and
        the employee status is intentionally left untouched.
        """
        # Drop cached ORM state so re-reads see current rows + fresh selectin loads.
        self.session.expire_all()

        events = sorted(
            await self.repository.get_all(filters={"employee_id": employee_id}),
            key=lambda e: (e.effective_date, e.id),
        )

        final_job_id: Optional[int] = None
        final_main_dept_id: Optional[int] = None

        for ev in events:
            if exclude_event_id is not None and ev.id == exclude_event_id:
                continue
            if not ev.status or ev.status.name != "applied":
                continue
            for change in ev.changes or []:
                code = change.direction_type.code if change.direction_type else None
                if code == "JOB_CHANGE" and change.new_job_id is not None:
                    final_job_id = change.new_job_id
                elif (
                    code == "MAIN_DEPT_CHANGE" and change.new_department_id is not None
                ):
                    final_main_dept_id = change.new_department_id

        employee = await self._employee_repo.get_by_id(employee_id)
        if not employee:
            return

        # Job — restore to the replayed value (or clear when no job change remains).
        employee.job_id = final_job_id

        # Main department link — update / create / remove to match the replay.
        dept_repo = EmployeeDepartmentRepository(session=self.session)
        existing_main = await dept_repo.get_main_by_employee(employee_id)
        if final_main_dept_id is not None:
            if existing_main is not None:
                existing_main.department_id = final_main_dept_id
            else:
                await dept_repo.create_from_dict(
                    {
                        "employee_id": employee_id,
                        "department_id": final_main_dept_id,
                        "is_main": True,
                    }
                )
        elif existing_main is not None:
            # Nothing left to anchor a main department (e.g. activation removed).
            await dept_repo.delete_by_id(existing_main.id)

        await self.session.commit()
