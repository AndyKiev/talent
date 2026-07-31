"""Cheap employee display-info lookup (id / name / code) via a COLUMN select.

Selecting columns (not the Employee entity) never instantiates ORM objects, so
none of Employee's heavy selectin relationships (events, departments, person,
user_groups, …) fire. Services use this to fill creator/author/changer minis on
schemas whose model relationships are deliberately lazy="noload".

Employees carry no name column: the display name is composed here from the
person's parts in the viewer's preferred order. The returned dict shape
({"id", "name", "code"}) is unchanged, so every consumer keeps working.
"""

from collections.abc import Iterable

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_model import Employee
from backend.api_v1.person.person_model import Person
from backend.utils.name_order import current_surname_first
from backend.utils.person_names import compose_display_name

# The name parts to add to a column query that needs a display name. Select
# these (with a join on Person) and pass the two values to compose_row_name.
#
# There used to be an `employee_display_name_expr()` that concatenated the parts
# in SQL, which also allowed ORDER BY on the composed name. It could not survive
# the columns being encrypted: SQL now sees ciphertext, so concatenating it
# produces garbage and ordering by it orders random bytes. Composition and
# sorting both moved into Python — decrypting happens on the way out of the
# driver, so the values here are already plaintext.
EMPLOYEE_NAME_COLUMNS = (Person.first_name, Person.last_name)


def compose_row_name(first_name: str | None, last_name: str | None) -> str:
    """Display name for one row, in the current viewer's order."""
    return compose_display_name(first_name, last_name, current_surname_first())


async def fetch_employee_minis(
    session: AsyncSession, ids: Iterable[int | None]
) -> dict[int, dict]:
    """Map employee id -> {"id", "name", "code"}, name in the viewer's order."""
    wanted = {i for i in ids if i is not None}
    if not wanted:
        return {}
    rows = (
        await session.execute(
            select(
                Employee.id,
                Employee.code,
                Person.first_name,
                Person.last_name,
            )
            .join(Person, Person.id == Employee.person_id)
            .where(Employee.id.in_(wanted))
        )
    ).all()
    surname_first = current_surname_first()
    return {
        r[0]: {
            "id": r[0],
            "name": compose_display_name(r[2], r[3], surname_first),
            "code": r[1],
        }
        for r in rows
    }
