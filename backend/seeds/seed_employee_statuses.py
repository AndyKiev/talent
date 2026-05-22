import asyncio
from backend.database.db_helper import db_helper
from backend.api_v1.employee_status.employee_status_model import EmployeeStatus
from sqlalchemy import select

async def seed_employee_statuses():
    async with db_helper.session_factory() as session:
        result = await session.execute(select(EmployeeStatus).where(EmployeeStatus.id == 1))
        existing = result.scalar_one_or_none()
        if not existing:
            session.add(EmployeeStatus(name="Working"))
            await session.commit()
            print("Seeded: Working status")
        else:
            print("Employee statuses already seeded, skipping.")

if __name__ == "__main__":
    asyncio.run(seed_employee_statuses())