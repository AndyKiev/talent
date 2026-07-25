"""Cheap employee display-info lookup (id / name / code) via a COLUMN select.

Selecting columns (not the Employee entity) never instantiates ORM objects, so
none of Employee's heavy selectin relationships (events, departments, person,
user_groups, …) fire. Services use this to fill creator/author/changer minis on
schemas whose model relationships are deliberately lazy="noload".
"""

from collections.abc import Iterable

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_model import Employee


async def fetch_employee_minis(
    session: AsyncSession, ids: Iterable[int | None]
) -> dict[int, dict]:
    wanted = {i for i in ids if i is not None}
    if not wanted:
        return {}
    rows = (
        await session.execute(
            select(Employee.id, Employee.name, Employee.code).where(
                Employee.id.in_(wanted)
            )
        )
    ).all()
    return {r[0]: {"id": r[0], "name": r[1], "code": r[2]} for r in rows}
