import asyncio
from backend.database.db_helper import db_helper
from backend.api_v1.employee.employee_model import Employee
from sqlalchemy import select

async def seed_employee():
    async with db_helper.session_factory() as session:
        result = await session.execute(select(Employee).where(Employee.code == "UKR7101004"))
        existing = result.scalar_one_or_none()
        if not existing:
            session.add(Employee(
                code="UKR7101004",
                name="БАКУЛІН АНДРІЙ",
                email=None,
                is_active=True,
                status_id=1,
                job_id=1,
                lang_id=3,
            ))
            await session.commit()
            print("Seeded: БАКУЛІН АНДРІЙ")
        else:
            print("Employee UKR7101004 already exists, skipping.")

if __name__ == "__main__":
    asyncio.run(seed_employee())