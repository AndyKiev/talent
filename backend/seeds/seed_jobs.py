import asyncio
from backend.database.db_helper import db_helper
from backend.api_v1.job.job_model import Job
from sqlalchemy import select

async def seed_jobs():
    async with db_helper.session_factory() as session:
        result = await session.execute(select(Job).where(Job.id == 1))
        existing = result.scalar_one_or_none()
        if not existing:
            session.add(Job(name="Developer", description="Software developer"))
            await session.commit()
            print("Seeded: Developer job")
        else:
            print("Jobs already seeded, skipping.")

if __name__ == "__main__":
    asyncio.run(seed_jobs())