import asyncio
from sqlalchemy import select

from backend.database.db_helper import db_helper
from backend.api_v1.language_level.language_level_model import LanguageLevel

# CEFR A1..C2 with the "can-do" hint shown when a level is selected.
LEVELS = [
    {
        "code": "A1",
        "label": "Beginner",
        "sort_order": 10,
        "hint": "Can understand and use familiar everyday expressions and very basic "
                "phrases aimed at the satisfaction of needs of a concrete type.",
    },
    {
        "code": "A2",
        "label": "Elementary",
        "sort_order": 20,
        "hint": "Can communicate in simple and routine tasks on familiar topics and "
                "describe in simple terms aspects of their background and immediate environment.",
    },
    {
        "code": "B1",
        "label": "Intermediate",
        "sort_order": 30,
        "hint": "Can deal with most situations while travelling, and produce simple "
                "connected text on familiar topics; can describe experiences and events.",
    },
    {
        "code": "B2",
        "label": "Upper-Intermediate",
        "sort_order": 40,
        "hint": "Can interact with a degree of fluency and spontaneity, and produce "
                "clear, detailed text on a wide range of subjects.",
    },
    {
        "code": "C1",
        "label": "Advanced",
        "sort_order": 50,
        "hint": "Can use language flexibly and effectively for social, academic and "
                "professional purposes; expresses ideas fluently without much searching.",
    },
    {
        "code": "C2",
        "label": "Proficiency",
        "sort_order": 60,
        "hint": "Can understand with ease virtually everything heard or read, and "
                "express themselves spontaneously, very fluently and precisely.",
    },
]


async def seed_language_levels():
    async with db_helper.session_factory() as session:
        for data in LEVELS:
            result = await session.execute(
                select(LanguageLevel).where(LanguageLevel.code == data["code"])
            )
            existing = result.scalar_one_or_none()
            if not existing:
                session.add(LanguageLevel(**data))
                print(f"Seeded language level: {data['code']}")
            else:
                print(f"Language level '{data['code']}' already exists, skipping.")
        await session.commit()


if __name__ == "__main__":
    asyncio.run(seed_language_levels())
