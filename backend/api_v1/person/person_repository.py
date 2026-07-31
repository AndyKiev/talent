from collections.abc import Sequence

from sqlalchemy import func, select

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.person.person_model import Person
from backend.utils.crypto.blind_index import name_blind_index


class PersonRepository(BaseRepository):

    model = Person

    async def find_by_normalized_name(
        self, first_name: str, last_name: str
    ) -> Sequence[Person]:
        """All persons with this (last, first) pair, case-insensitive.

        Matched on the blind index, not the columns: the name columns are
        encrypted with a randomized cipher, so `lower(last_name) = lower(?)`
        would match nothing at all — and would do it silently, quietly turning
        namesake detection off. Case-insensitivity now lives inside the hash
        (see normalize_for_index).
        """
        stmt = (
            select(Person)
            .where(Person.name_hash == name_blind_index(first_name, last_name))
            .order_by(Person.name_dedupe_no)
        )
        result = await self.session.scalars(stmt)
        return result.all()

    async def get_next_dedupe_no(self, first_name: str, last_name: str) -> int:
        stmt = select(func.coalesce(func.max(Person.name_dedupe_no), -1) + 1).where(
            Person.name_hash == name_blind_index(first_name, last_name)
        )
        return (await self.session.execute(stmt)).scalar_one()

    async def get_by_employee_id(self, employee_id: int) -> Person | None:
        from backend.api_v1.employee.employee_model import Employee

        stmt = (
            select(Person)
            .join(Employee, Employee.person_id == Person.id)
            .where(Employee.id == employee_id)
        )
        return await self.session.scalar(stmt)

    async def get_by_employee_code(self, code: str) -> Person | None:
        from backend.api_v1.employee.employee_model import Employee

        stmt = (
            select(Person)
            .join(Employee, Employee.person_id == Person.id)
            .where(func.upper(Employee.code) == code.strip().upper())
        )
        return await self.session.scalar(stmt)
