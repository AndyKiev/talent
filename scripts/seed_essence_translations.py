"""Seed missing essence translations directly into the DB.
Run from the backend directory:  cd backend && poetry run python ../scripts/seed_essence_translations.py
"""
import asyncio
import sys
import os

_scripts_dir = os.path.dirname(os.path.abspath(__file__))
_repo_root = os.path.dirname(_scripts_dir)
if _repo_root not in sys.path:
    sys.path.insert(0, _repo_root)

from backend.database.db_helper import db_helper
from backend.api_v1.msg_key.msg_key_model import MsgKey
from backend.api_v1.msg_pg.msg_model import Msg
from sqlalchemy import select

# (camelCase key, English value, Ukrainian value)
TRANSLATIONS: list[tuple[str, str, str]] = [
    ("appSetting", "Application setting", "Налаштування програми"),
    ("changeLog", "Change log", "Журнал змін"),
    ("changeSession", "Change session", "Сесія змін"),
    ("dbTable", "DB table", "Таблиця БД"),
    ("employeeTraining", "Employee training", "Навчання співробітника"),
    ("employeeTrainingStatus", "Employee training status", "Статус навчання"),
    ("languageLevel", "Language level", "Рівень мови"),
    ("menu", "Menu", "Меню"),
    ("person", "Person", "Особа"),
    ("processRole", "Process role", "Роль процесу"),
    ("processRoleHolder", "Process role holder", "Власник ролі"),
    ("reviewDimension", "Review dimension", "Вимір оцінювання"),
    ("reviewDimensionCriterion", "Review dimension criterion", "Критерій виміру"),
    ("reviewLevel", "Review level", "Рівень оцінювання"),
    ("reviewLevelRequirement", "Review level requirement", "Вимога рівня"),
    ("reviewSessionStatus", "Review session status", "Статус сесії оцінювання"),
    ("trainingTypeJobCategoryLink", "Training type — job category link", "Зв'язок: тип навчання — категорія посади"),
    ("trainingTypeJobLink", "Training type — job link", "Зв'язок: тип навчання — посада"),
]


async def seed():
    async with db_helper.session_factory() as session:
        for key_name, eng, ukr in TRANSLATIONS:
            key_row = await session.scalar(
                select(MsgKey).where(MsgKey.name == key_name)
            )
            if key_row is None:
                key_row = MsgKey(name=key_name)
                session.add(key_row)
                await session.flush()
                print(f"  Created msg_key: {key_name}")
            else:
                print(f"  msg_key already exists: {key_name} (id={key_row.id})")

            # Upsert: eng (lang_id=2) and ukr (lang_id=3)
            for lang_id, text in [(2, eng), (3, ukr)]:
                existing = await session.scalar(
                    select(Msg).where(
                        Msg.msg_key_id == key_row.id,
                        Msg.lang_id == lang_id,
                    )
                )
                if existing:
                    if existing.value != text:
                        existing.value = text
                        print(f"    Updated lang_id={lang_id}: {text}")
                else:
                    session.add(Msg(msg_key_id=key_row.id, lang_id=lang_id, value=text))
                    print(f"    Created lang_id={lang_id}: {text}")

        await session.commit()
        print(f"\nDone. {len(TRANSLATIONS)} translations seeded.")


if __name__ == "__main__":
    asyncio.run(seed())
