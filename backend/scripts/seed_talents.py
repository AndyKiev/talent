"""Seed talent records for existing employees.

For every existing employee (except the admin UKR7101004) that does not yet have
a talent audit, create:

  * a `talent_audit` row (status = created), and
  * 1 talent target job (95% of employees) or 2 (the other ~5%).

Target-job choice is "hierarchically reasonable" — a widening fallback chain
relative to the employee's CURRENT job + main department:

    1) a different active job linked to the SAME department type
    2) else jobs of SIBLING departments (same parent) types
    3) else jobs of the PARENT department's type
    4) else a DIRECTORATE job

The 2nd talent (the ~5% with two) targets a DIRECTORATE job (the user's "5% could
be for jobs in directorates when employees work in hypermarkets"). The 2nd
talent's PERIOD is strictly longer than the 1st (e.g. 1st PO-12, 2nd PO/PA-24/36)
— this ascending-period rule is also enforced by TalentAuditJobService.

Statuses are PO (Potential) / PA (Pari); valid status-period links only (PA has
no 36-month link). `talent_plus` is left at its default (False).

Reuses the real services (`TalentAuditService.create_talent_audit` +
`TalentAuditJobService.create_talent_audit_job`, which validate ascending /
duplicate periods), with the admin as the `created_by` actor.

Idempotent: employees that already have a talent audit are skipped. The admin is
never given a talent here (he already has one) and is never touched.

Run from `backend/` with the poetry venv:
    poetry run python scripts/seed_talents.py
or from the repo root:
    poetry run python -m backend.scripts.seed_talents
"""

import asyncio
import os
import random
import sys

sys.path.insert(
    0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)

from backend.api_v1.employee.employee_repository import EmployeeRepository
from backend.api_v1.employee.employee_service import EmployeeService
from backend.api_v1.talent_audit.talent_audit_repository import (
    TalentAuditRepository,
)
from backend.api_v1.talent_audit.talent_audit_schema import TalentAuditCreate
from backend.api_v1.talent_audit.talent_audit_service import (
    TalentAuditService,
)
from backend.api_v1.talent_audit_job.talent_audit_job_repository import (
    TalentAuditJobRepository,
)
from backend.api_v1.talent_audit_job.talent_audit_job_schema import (
    TalentAuditJobCreate,
)
from backend.api_v1.talent_audit_job.talent_audit_job_service import (
    TalentAuditJobService,
)
from backend.database.db_helper import db_helper
from sqlalchemy import text

ADMIN_CODE = "UKR7101004"
SEED = 42
TWO_TALENT_FRACTION = 0.05  # ~5% of employees get a 2nd (higher) talent job
SMALL_PERIOD_MONTHS = (6, 12)  # 1st talent period pool
LARGE_PERIOD_MONTHS = (18, 24, 36)  # 2nd talent period pool (must exceed the 1st)


async def _scalars(session, sql, params=None):
    return list((await session.execute(text(sql), params or {})).scalars().all())


async def main() -> None:
    random.seed(SEED)
    created_audits = 0
    created_jobs = 0
    skipped = []  # (code, reason)

    async with db_helper.session_factory() as session:
        admin = await EmployeeService(
            repository=EmployeeRepository(session=session), session=session
        ).get_by_code(ADMIN_CODE)
        ta_service = TalentAuditService(
            repository=TalentAuditRepository(session=session), user=admin, session=session
        )
        taj_service = TalentAuditJobService(
            repository=TalentAuditJobRepository(session=session),
            user=admin,
            session=session,
        )

        # Reference ids.
        audit_status_id = (
            await session.execute(
                text("SELECT id FROM talent_audit_statuses WHERE name='created'")
            )
        ).scalar()
        job_status_created_id = (
            await session.execute(
                text("SELECT id FROM talent_audit_job_statuses WHERE key='created'")
            )
        ).scalar()
        if audit_status_id is None or job_status_created_id is None:
            raise SystemExit("Required talent statuses ('created') not found in DB.")

        # status-period links by month bucket -> [link_id]
        link_rows = (
            await session.execute(
                text(
                    "SELECT l.id, tp.qty_months FROM talent_status_period_link l "
                    "JOIN talent_periods tp ON tp.id=l.talent_period_id WHERE l.is_active"
                )
            )
        ).all()
        links_by_month: dict[int, list[int]] = {}
        for r in link_rows:
            links_by_month.setdefault(r._mapping["qty_months"], []).append(
                r._mapping["id"]
            )
        small_links = [
            (m, lid) for m in SMALL_PERIOD_MONTHS for lid in links_by_month.get(m, [])
        ]
        large_links = [
            (m, lid) for m in LARGE_PERIOD_MONTHS for lid in links_by_month.get(m, [])
        ]
        if not small_links or not large_links:
            raise SystemExit("Missing talent_status_period_link rows for the periods.")

        # Directorate job pool (pool #4 / the 2nd-talent target).
        directorate_jobs = set(
            await _scalars(
                session,
                "SELECT DISTINCT l.job_id FROM department_type_job_links l "
                "JOIN departments d ON d.department_type_id = l.department_type_id "
                "JOIN department_categories dc ON dc.id = d.department_category_id "
                "WHERE dc.key='directorate' AND l.is_active AND d.is_active",
            )
        )

        _type_jobs_cache: dict[int, set[int]] = {}

        async def jobs_for_type(type_id: int) -> set[int]:
            if type_id not in _type_jobs_cache:
                _type_jobs_cache[type_id] = set(
                    await _scalars(
                        session,
                        "SELECT job_id FROM department_type_job_links "
                        "WHERE department_type_id=:t AND is_active",
                        {"t": type_id},
                    )
                )
            return _type_jobs_cache[type_id]

        # Employees needing a talent audit (no audit yet, not the admin).
        emp_rows = (
            await session.execute(
                text(
                    "SELECT e.id, e.code, e.job_id FROM employees e "
                    "WHERE e.code <> :admin "
                    "AND NOT EXISTS (SELECT 1 FROM talent_audit ta WHERE ta.employee_id = e.id) "
                    "ORDER BY e.id"
                ),
                {"admin": ADMIN_CODE},
            )
        ).all()
        employees = [dict(r._mapping) for r in emp_rows]
        if not employees:
            print("Nothing to seed — every employee already has a talent audit.")
            return

        # Pick the ~5% that get a 2nd talent job.
        n_two = max(1, round(len(employees) * TWO_TALENT_FRACTION)) if employees else 0
        two_talent_ids = set(random.sample([e["id"] for e in employees], n_two))

        print(f"{len(employees)} employee(s) need talents; {n_two} will get 2 jobs.")

        for emp in employees:
            eid, code, j0 = emp["id"], emp["code"], emp["job_id"]
            if j0 is None:
                skipped.append((code, "no current job"))
                continue

            main = (
                await session.execute(
                    text(
                        "SELECT d.id dept_id, d.department_type_id dt, d.parent_id parent "
                        "FROM employee_departments ed JOIN departments d ON d.id=ed.department_id "
                        "WHERE ed.employee_id=:e LIMIT 1"
                    ),
                    {"e": eid},
                )
            ).first()
            if main is None:
                skipped.append((code, "no main department"))
                continue
            dt_id, parent_id = main._mapping["dt"], main._mapping["parent"]

            # Build the widening target pools.
            pool1 = await jobs_for_type(dt_id) - {j0}
            pool2: set[int] = set()
            parent_type_id = None
            if parent_id is not None:
                sib_types = await _scalars(
                    session,
                    "SELECT DISTINCT department_type_id FROM departments "
                    "WHERE parent_id=:p AND is_active AND id<>:self",
                    {"p": parent_id, "self": main._mapping["dept_id"]},
                )
                for st in sib_types:
                    pool2 |= await jobs_for_type(st)
                pool2 -= {j0}
                parent_type_id = (
                    await session.execute(
                        text("SELECT department_type_id FROM departments WHERE id=:p"),
                        {"p": parent_id},
                    )
                ).scalar()
            pool3 = (await jobs_for_type(parent_type_id) - {j0}) if parent_type_id else set()
            pool4 = directorate_jobs - {j0}

            target1 = None
            for pool in (pool1, pool2, pool3, pool4):
                if pool:
                    target1 = random.choice(sorted(pool))
                    break
            if target1 is None:
                skipped.append((code, "no reasonable target job found"))
                continue

            # Create the audit + 1st talent job.
            audit_resp = await ta_service.create_talent_audit(
                TalentAuditCreate(employee_id=eid, status_id=audit_status_id)
            )
            audit_id = audit_resp.data.id
            created_audits += 1

            m1, link1 = random.choice(small_links)
            await taj_service.create_talent_audit_job(
                TalentAuditJobCreate(
                    talent_audit_id=audit_id,
                    target_job_id=target1,
                    status_id=job_status_created_id,
                    talent_status_period_link_id=link1,
                )
            )
            created_jobs += 1
            note = f"  + {code}: audit {audit_id}, job1 -> {target1} ({m1}mo)"

            # Optional 2nd (higher) talent: a directorate job, longer period.
            if eid in two_talent_ids:
                target2 = None
                for pool in (pool4, pool3, pool2):
                    cands = pool - {j0, target1}
                    if cands:
                        target2 = random.choice(sorted(cands))
                        break
                bigger = [(m, lid) for (m, lid) in large_links if m > m1]
                if target2 is not None and bigger:
                    m2, link2 = random.choice(bigger)
                    await taj_service.create_talent_audit_job(
                        TalentAuditJobCreate(
                            talent_audit_id=audit_id,
                            target_job_id=target2,
                            status_id=job_status_created_id,
                            talent_status_period_link_id=link2,
                        )
                    )
                    created_jobs += 1
                    note += f", job2 -> {target2} ({m2}mo)"
            print(note)

    print(
        f"\nTalents seeded: {created_audits} audit(s), {created_jobs} talent job(s). "
        f"Skipped {len(skipped)}."
    )
    for code, reason in skipped:
        print(f"  ! skipped {code}: {reason}")


if __name__ == "__main__":
    asyncio.run(main())
