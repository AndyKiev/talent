"""Delete ALL employees (with full owned-data cascade), except the admin.

Counterpart to ``seed_employees.py``. Removes every employee EXCEPT the admin
(``UKR7101004``), cascade-deleting each one's OWN dependent data first
(events + their change rows, department links, group links, personal data,
review participation, hrm scopes, process-role holdings, etc.) so the final
DELETE succeeds.

It reuses ``EmployeeService.delete_user(force=True)`` — the same blessed delete
path used by the API — driven by the admin marked as a bypass/dev user, which
enables the force-cascade (see ``EmployeeService._force_cascade_sql``). Content
an employee AUTHORED about OTHER employees (e.g. events they created as HRM) is
never silently destroyed: if any such reference remains, that employee is
reported as blocked and skipped rather than deleted.

The admin (``UKR7101004``) is ALWAYS skipped.

Run from the repo root (or ``backend/``) with the poetry venv:
    python -m backend.scripts.delete_employees
"""

import asyncio
import os
import sys

# Make the repo root importable so `backend...` resolves regardless of CWD.
sys.path.insert(
    0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)

from fastapi import HTTPException  # noqa: E402
from sqlalchemy import text  # noqa: E402

from backend.database.db_helper import db_helper  # noqa: E402
from backend.api_v1.employee.employee_repository import EmployeeRepository  # noqa: E402
from backend.api_v1.employee.employee_service import EmployeeService  # noqa: E402

ADMIN_CODE = "UKR7101004"  # the real admin (me) — never deleted


async def main() -> None:
    deleted = 0
    blocked: list[tuple[str, str]] = []

    async with db_helper.session_factory() as session:
        boot = EmployeeService(
            repository=EmployeeRepository(session=session), session=session
        )
        admin = await boot.get_by_code(ADMIN_CODE)
        # Mark the actor as a bypass/dev user so delete_user(force=True) runs the
        # owned-data force-cascade (is_dev gate in EmployeeService.delete_user).
        admin.is_bypass = True
        print(f"Actor: {admin.code} (id={admin.id}) — will NOT be deleted.")

        service = EmployeeService(
            repository=EmployeeRepository(session=session), user=admin, session=session
        )

        rows = (
            await session.execute(
                text("SELECT id, code FROM employees WHERE code <> :admin ORDER BY id"),
                {"admin": ADMIN_CODE},
            )
        ).all()

        if not rows:
            print("No employees to delete (only the admin remains).")
            return

        print(f"Deleting {len(rows)} employee(s)...")
        for r in rows:
            emp_id, code = r._mapping["id"], r._mapping["code"]
            try:
                # delete_user raises HTTPException(200) on success (translated msg).
                await service.delete_user(emp_id, force=True)
                deleted += 1
                print(f"  - {code} (id={emp_id}) deleted")
            except HTTPException as exc:
                if exc.status_code == 200:
                    deleted += 1
                    print(f"  - {code} (id={emp_id}) deleted")
                else:
                    await session.rollback()
                    blocked.append((code, str(exc.detail)))
                    print(f"  ! {code} (id={emp_id}) blocked: {exc.detail}")
            except Exception as exc:  # noqa: BLE001 — keep going, report at end
                await session.rollback()
                detail = getattr(exc, "resolved_message", None) or str(exc)
                blocked.append((code, detail))
                print(f"  ! {code} (id={emp_id}) error: {detail}")

    print(f"\nDelete complete: removed {deleted} employee(s); {len(blocked)} blocked/failed.")
    if blocked:
        print("Blocked/failed (authored content about others, or other refs):")
        for code, detail in blocked:
            print(f"  ! {code}: {detail}")


if __name__ == "__main__":
    asyncio.run(main())
