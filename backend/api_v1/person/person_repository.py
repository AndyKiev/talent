from typing import Optional, Sequence

from sqlalchemy import select, func

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.person.person_model import Person


class PersonRepository(BaseRepository):

    model = Person

    async def find_by_normalized_name(
        self, first_name: str, last_name: str
    ) -> Sequence[Person]:
        """All persons with this (last, first) pair, case-insensitive."""
        stmt = (
            select(Person)
            .where(
                func.lower(Person.last_name) == func.lower(last_name),
                func.lower(Person.first_name) == func.lower(first_name),
            )
            .order_by(Person.name_dedupe_no)
        )
        result = await self.session.scalars(stmt)
        return result.all()

    async def get_next_dedupe_no(self, first_name: str, last_name: str) -> int:
        stmt = select(func.coalesce(func.max(Person.name_dedupe_no), -1) + 1).where(
            func.lower(Person.last_name) == func.lower(last_name),
            func.lower(Person.first_name) == func.lower(first_name),
        )
        return (await self.session.execute(stmt)).scalar_one()

    async def get_by_employee_id(self, employee_id: int) -> Optional[Person]:
        from backend.api_v1.employee.employee_model import Employee

        stmt = (
            select(Person)
            .join(Employee, Employee.person_id == Person.id)
            .where(Employee.id == employee_id)
        )
        return await self.session.scalar(stmt)

    async def get_by_employee_code(self, code: str) -> Optional[Person]:
        from backend.api_v1.employee.employee_model import Employee

        stmt = (
            select(Person)
            .join(Employee, Employee.person_id == Person.id)
            .where(func.upper(Employee.code) == code.strip().upper())
        )
        return await self.session.scalar(stmt)
