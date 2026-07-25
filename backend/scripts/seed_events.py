"""Seed career events for existing employees — mostly job changes aligned with
their talent plan.

For each working employee (except the admin) that currently has ONLY their
activation event, create one further event, then apply due events. The mix is
weighted toward job changes:

  * PROMOTION  — JOB_CHANGE into one of the employee's OPEN talent target jobs
                 (job change in place; department unchanged).
  * TRANSFER   — JOB_CHANGE into a store-level talent target + MAIN_DEPT_CHANGE
                 to the matching department of ANOTHER store in the SAME region
                 (e.g. Почайна → Біличі). Falls back to PROMOTION if no valid
                 same-region destination links the talent job.
  * a FEW      — TEMPORARY_LEAVE (→ maternity/coscription), DISMISSAL (→ dismissed),
                 and RETURN (→ working) for some of those put on leave.
  * RESPONSIBILITY_CHANGE is never emitted.

All events are dated after the employee's activation and on/before today, so
`apply_due_events` applies them. Applying a PROMOTION/TRANSFER also runs the
existing talent reconcile (the matched talent job → applied, lower-period open
jobs → skipped) — expected.

Reuses the real `EmployeeEventService.create_employee_event` (which runs the
talent-alignment guard — a no-op while `allow_unaligned_events` is True) and
`apply_due_events`, with the admin as the acting HRM.

Idempotent-ish: only employees whose sole event is the activation are processed,
so re-running does not pile extra events on already-seeded employees. The admin
(`UKR7101004`) is never touched.

Run from `backend/` with the poetry venv:
    poetry run python scripts/seed_events.py
or from the repo root:
    poetry run python -m backend.scripts.seed_events
"""

import asyncio
import datetime
import os
import random
import sys

sys.path.insert(
    0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)

from backend.api_v1.employee.employee_repository import EmployeeRepository
from backend.api_v1.employee.employee_service import EmployeeService
from backend.api_v1.employee_events.employee_event.employee_event_repository import (
    EmployeeEventRepository,
)
from backend.api_v1.employee_events.employee_event.employee_event_schema import (
    EmployeeEventCreate,
)
from backend.api_v1.employee_events.employee_event.employee_event_service import (
    EmployeeEventService,
)
from backend.api_v1.employee_events.employee_event_change.employee_event_change_schema import (
    EmployeeEventChangeCreate,
)
from backend.database.db_helper import db_helper
from sqlalchemy import text

ADMIN_CODE = "UKR7101004"
SEED = 42
OPEN_TALENT_STATUS_KEYS = ("created", "closed")
# Few leave / dismissal; the rest are job changes.
DISMISS_FRACTION = 0.05
LEAVE_FRACTION = 0.10
RETURN_FRACTION_OF_LEAVE = 0.5  # half of those put on leave later return
TRANSFER_ATTEMPT_FRACTION = 0.40  # of the job-change group, try TRANSFER this often


def _rand_date_between(start: datetime.date, end: datetime.date) -> datetime.date:
    span = (end - start).days
    if span <= 0:
        return end
    return start + datetime.timedelta(days=random.randint(1, span))


async def main() -> None:
    random.seed(SEED)
    today = datetime.date.today()
    created = {"PROMOTION": 0, "TRANSFER": 0, "TEMPORARY_LEAVE": 0, "DISMISSAL": 0, "RETURN": 0}
    fallbacks = 0
    skipped = []

    async with db_helper.session_factory() as session:
        admin = await EmployeeService(
            repository=EmployeeRepository(session=session), session=session
        ).get_by_code(ADMIN_CODE)
        ev = EmployeeEventService(
            repository=EmployeeEventRepository(session=session), user=admin, session=session
        )

        async def scalars(sql, params=None):
            return list((await session.execute(text(sql), params or {})).scalars().all())

        # Reference ids.
        types = {
            r._mapping["code"]: r._mapping["id"]
            for r in (await session.execute(text("SELECT id, code FROM employee_event_types"))).all()
        }
        dirs = {
            r._mapping["code"]: r._mapping["id"]
            for r in (await session.execute(text("SELECT id, code FROM employee_event_direction_types"))).all()
        }
        draft_id = (await session.execute(text("SELECT id FROM employee_event_statuses WHERE name='draft'"))).scalar()
        status_ids = {
            r._mapping["name"]: r._mapping["id"]
            for r in (await session.execute(text("SELECT id, name FROM employee_statuses"))).all()
        }

        # ── Topology maps for TRANSFER destinations ──────────────────────────
        region_of_store = {
            r._mapping["department_id"]: r._mapping["region_id"]
            for r in (await session.execute(text("SELECT department_id, region_id FROM department_region_links WHERE is_active"))).all()
        }
        dept_rows = (await session.execute(text(
            "SELECT d.id, d.parent_id, d.department_type_id, dc.key cat "
            "FROM departments d JOIN department_categories dc ON dc.id=d.department_category_id WHERE d.is_active"
        ))).all()
        parent_of = {r._mapping["id"]: r._mapping["parent_id"] for r in dept_rows}
        cat_of = {r._mapping["id"]: r._mapping["cat"] for r in dept_rows}
        depts_of_type: dict[int, list[int]] = {}
        for r in dept_rows:
            depts_of_type.setdefault(r._mapping["department_type_id"], []).append(r._mapping["id"])

        def store_of(dept_id):
            """First ancestor-or-self that carries a region link (the store)."""
            seen = set()
            cur = dept_id
            while cur is not None and cur not in seen:
                seen.add(cur)
                if cur in region_of_store:
                    return cur
                cur = parent_of.get(cur)
            return None

        _types_linking_job: dict[int, set[int]] = {}

        async def types_linking_job(job_id):
            if job_id not in _types_linking_job:
                _types_linking_job[job_id] = set(
                    await scalars(
                        "SELECT department_type_id FROM department_type_job_links WHERE job_id=:j AND is_active",
                        {"j": job_id},
                    )
                )
            return _types_linking_job[job_id]

        async def find_transfer_dest(cur_main_dept, job_id):
            """A department in another SAME-REGION store (category 'store') whose
            type links `job_id`. None if no valid destination exists."""
            my_store = store_of(cur_main_dept)
            if my_store is None or cat_of.get(my_store) != "store":
                return None
            my_region = region_of_store.get(my_store)
            for t in await types_linking_job(job_id):
                for d2 in depts_of_type.get(t, []):
                    if d2 == cur_main_dept:
                        continue
                    s2 = store_of(d2)
                    if s2 is None or s2 == my_store or cat_of.get(s2) != "store":
                        continue
                    if region_of_store.get(s2) == my_region:
                        return d2
            return None

        # ── Candidate employees: working, non-admin, only the activation event ──
        emp_rows = (await session.execute(text(
            "SELECT e.id, e.code, e.job_id, es.name status FROM employees e "
            "JOIN employee_statuses es ON es.id=e.status_id "
            "WHERE e.code <> :admin AND es.name='working' "
            "AND (SELECT COUNT(*) FROM employee_events ev WHERE ev.employee_id=e.id) = 1 "
            "ORDER BY e.id"
        ), {"admin": ADMIN_CODE})).all()
        employees = [dict(r._mapping) for r in emp_rows]
        if not employees:
            print("No eligible employees (each must have exactly the activation event).")
            return

        # Activation date + main dept + open talent targets per employee.
        for e in employees:
            e["act_date"] = (await session.execute(text(
                "SELECT MIN(effective_date) FROM employee_events WHERE employee_id=:e"
            ), {"e": e["id"]})).scalar()
            e["main_dept"] = (await session.execute(text(
                "SELECT department_id FROM employee_departments WHERE employee_id=:e LIMIT 1"
            ), {"e": e["id"]})).scalar()
            e["targets"] = await scalars(
                "SELECT j.target_job_id FROM talent_audit ta "
                "JOIN talent_audit_job j ON j.talent_audit_id=ta.id "
                "JOIN talent_audit_job_statuses st ON st.id=j.status_id "
                "WHERE ta.employee_id=:e AND st.key = ANY(:keys) "
                "ORDER BY j.id",
                {"e": e["id"], "keys": list(OPEN_TALENT_STATUS_KEYS)},
            )

        # ── Assign event kinds (deterministic slices keep leave/dismissal few) ──
        random.shuffle(employees)
        n = len(employees)
        n_dismiss = round(n * DISMISS_FRACTION)
        n_leave = round(n * LEAVE_FRACTION)
        dismiss_set = {e["id"] for e in employees[:n_dismiss]}
        leave_slice = employees[n_dismiss:n_dismiss + n_leave]
        leave_set = {e["id"] for e in leave_slice}
        return_set = {e["id"] for e in leave_slice[: round(len(leave_slice) * RETURN_FRACTION_OF_LEAVE)]}

        print(f"{n} eligible employee(s): ~{n_dismiss} dismissal, ~{n_leave} leave "
              f"({len(return_set)} of them return), rest job changes.")

        # ── Phase 1: create one event per employee ───────────────────────────
        for e in employees:
            eid, code = e["id"], e["code"]
            act = e["act_date"] or (today - datetime.timedelta(days=365))
            edate = _rand_date_between(act, today)

            if eid in dismiss_set:
                # DISMISSAL: STATUS_CHANGE -> dismissed is auto-created by the service.
                event_in = EmployeeEventCreate(
                    event_type_id=types["DISMISSAL"], status_id=draft_id,
                    effective_date=edate, changes=[],
                )
                kind = "DISMISSAL"
            elif eid in leave_set:
                leave_status = random.choice([status_ids["maternity"], status_ids["coscription"]])
                event_in = EmployeeEventCreate(
                    event_type_id=types["TEMPORARY_LEAVE"], status_id=draft_id,
                    effective_date=edate,
                    changes=[EmployeeEventChangeCreate(
                        direction_type_id=dirs["STATUS_CHANGE"], new_status_id=leave_status)],
                )
                kind = "TEMPORARY_LEAVE"
                e["leave_date"] = edate
            else:
                # Job change. Need at least one open talent target.
                if not e["targets"]:
                    skipped.append((code, "no open talent target"))
                    continue
                kind = "PROMOTION"
                changes = None
                if random.random() < TRANSFER_ATTEMPT_FRACTION and e["main_dept"]:
                    for j in e["targets"]:
                        dest = await find_transfer_dest(e["main_dept"], j)
                        if dest is not None:
                            changes = [
                                EmployeeEventChangeCreate(direction_type_id=dirs["JOB_CHANGE"], new_job_id=j),
                                EmployeeEventChangeCreate(direction_type_id=dirs["MAIN_DEPT_CHANGE"], new_department_id=dest),
                            ]
                            kind = "TRANSFER"
                            break
                if changes is None:
                    if kind == "TRANSFER":
                        fallbacks += 1
                    kind = "PROMOTION"
                    changes = [EmployeeEventChangeCreate(
                        direction_type_id=dirs["JOB_CHANGE"], new_job_id=e["targets"][0])]
                event_in = EmployeeEventCreate(
                    event_type_id=types[kind], status_id=draft_id,
                    effective_date=edate, changes=changes,
                )

            try:
                await ev.create_employee_event(eid, event_in)
                created[kind] += 1
            except Exception as exc:  # noqa: BLE001
                await session.rollback()
                skipped.append((code, f"{kind}: {type(exc).__name__}: {exc}"))

        # ── Phase 2: apply all due events ────────────────────────────────────
        stats1 = await ev.apply_due_events(today)
        print(f"apply #1: applied {stats1['applied']}/{stats1['checked']} (failed {stats1['failed']}).")

        # ── Phase 3: RETURN for some employees now on leave ──────────────────
        ret_created = 0
        for e in employees:
            if e["id"] not in return_set:
                continue
            ldate = e.get("leave_date") or e["act_date"]
            rdate = _rand_date_between(ldate, today)
            event_in = EmployeeEventCreate(
                event_type_id=types["RETURN"], status_id=draft_id,
                effective_date=rdate, changes=[],
            )
            try:
                await ev.create_employee_event(e["id"], event_in)
                ret_created += 1
            except Exception as exc:  # noqa: BLE001
                await session.rollback()
                skipped.append((e["code"], f"RETURN: {type(exc).__name__}: {exc}"))
        created["RETURN"] = ret_created
        if ret_created:
            stats2 = await ev.apply_due_events(today)
            print(f"apply #2 (returns): applied {stats2['applied']}/{stats2['checked']} (failed {stats2['failed']}).")

    print(
        "\nEvents seeded: "
        + ", ".join(f"{k}={v}" for k, v in created.items())
        + f"  (transfer->promotion fallbacks: {fallbacks}); skipped {len(skipped)}."
    )
    for code, reason in skipped[:30]:
        print(f"  ! {code}: {reason}")


if __name__ == "__main__":
    asyncio.run(main())
