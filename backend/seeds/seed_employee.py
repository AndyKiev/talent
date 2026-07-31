import asyncio

from sqlalchemy import select

from backend.api_v1.employee.employee_model import Employee
from backend.api_v1.person.person_model import Person
from backend.database.db_helper import db_helper
from backend.utils.person_names import normalize_name_part, split_employee_full_name


async def seed_employee():
    async with db_helper.session_factory() as session:
        result = await session.execute(
            select(Employee).where(Employee.code == "UKR7101004")
        )
        existing = result.scalar_one_or_none()
        if not existing:
            last_raw, first_raw, patronymic_raw = split_employee_full_name(
                "БАКУЛІН АНДРІЙ"
            )
            person = Person(
                first_name=normalize_name_part(first_raw),
                last_name=normalize_name_part(last_raw),
                patronymic=normalize_name_part(patronymic_raw),
            )
            session.add(person)
            await session.flush()
            session.add(
                Employee(
                    code="UKR7101004",
                    email=None,
                    is_active=True,
                    status_id=1,
                    job_id=1,
                    lang_id=3,
                    person_id=person.id,
                )
            )
            await session.commit()
            print("Seeded: БАКУЛІН АНДРІЙ")
        else:
            print("Employee UKR7101004 already exists, skipping.")


if __name__ == "__main__":
    asyncio.run(seed_employee())
