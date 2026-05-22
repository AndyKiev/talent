import asyncio
from backend.database.db_helper import db_helper
from backend.api_v1.lang.lang_model import Lang
from sqlalchemy import select


async def seed_langs():
    async with db_helper.session_factory() as session:
        for lang_data in [
            {"id": 2, "short_name": "eng", "name": "English"},
            {"id": 3, "short_name": "ukr", "name": "Ukrainian"},
        ]:
            # Check if language exists by id OR short_name
            result = await session.execute(
                select(Lang).where(
                    (Lang.id == lang_data["id"]) | (Lang.short_name == lang_data["short_name"])
                )
            )
            existing = result.scalar_one_or_none()

            if not existing:
                session.add(Lang(id=lang_data["id"], short_name=lang_data["short_name"], name=lang_data["name"]))
                print(f"Seeded: {lang_data['name']}")
            else:
                print(
                    f"Language with id={lang_data['id']} or short_name='{lang_data['short_name']}' already exists, skipping.")
        await session.commit()


if __name__ == "__main__":
    asyncio.run(seed_langs())