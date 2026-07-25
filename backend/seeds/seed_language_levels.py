import asyncio
import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from sqlalchemy import select

from backend.api_v1.language_level.language_level_model import LanguageLevel
from backend.database.db_helper import db_helper

# CEFR A1..C2 with Ukrainian labels and "can-do" hints.
LEVELS = [
    {
        "code": "A1",
        "label": "Елементарний",
        "sort_order": 10,
        "hint": (
            "Розумію і вживаю елементарні речення. Вмію відрекомендуватись, "
            "запитувати і відповідати на запитання про деякі деталі особистого "
            "життя, про людей, про речі тощо. Взаємодію на простому рівні, "
            "якщо співрозмовник говорить повільно і чітко та готовий прийти на допомогу."
        ),
    },
    {
        "code": "A2",
        "label": "Елементарний",
        "sort_order": 20,
        "hint": (
            "Розумію ізольовані фрази та широко вживані вирази. Спілкуюсь на "
            "знайомі, звичні теми. Описую простими мовними засобами вигляд "
            "свого оточення, найближче середовище і все, що пов'язане зі "
            "сферою безпосередніх потреб."
        ),
    },
    {
        "code": "B1",
        "label": "(Вище) середнього",
        "sort_order": 30,
        "hint": (
            "Розумію основний зміст (на слух) на теми, близькі і часто вживані "
            "на роботі тощо. Можу просто і зв'язано висловитись на знайомі "
            "теми та описати досвід, події, сподівання, мрії тощо."
        ),
    },
    {
        "code": "B2",
        "label": "(Вище) середнього",
        "sort_order": 40,
        "hint": (
            "Розумію основні ідеї тексту як на конкретну, так і на абстрактну "
            "тему, у тому числі й дискусії за фахом. Вільно спілкуюсь з носіями "
            "мови, чітко висловлююсь на широке коло тем, виражаю свою думку "
            "з певної проблеми, наводячи різноманітні аргументи за і проти."
        ),
    },
    {
        "code": "C1",
        "label": "Просунутий",
        "sort_order": 50,
        "hint": (
            "Розумію широкий спектр достатньо складних та об'ємних текстів, "
            "без труднощів висловлюватись швидко і спонтанно. Чітко, логічно, "
            "детально висловлююсь на складні теми, демонструючи свідоме "
            "володіння граматичними структурами."
        ),
    },
    {
        "code": "C2",
        "label": "Досконалий",
        "sort_order": 60,
        "hint": (
            "Розумію практично все, що чую і читаю. Можу вилучити інформацію "
            "з усних / письмових джерел, узагальнити її і зробити аргументований "
            "виклад у зв'язній формі. Висловлююсь спонтанно, дуже швидко і "
            "точно, виділяючи найтонші відтінки смислу у доволі складних "
            "ситуаціях та демонструючи відмінне володіння граматикою."
        ),
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
