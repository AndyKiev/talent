"""
Insert display-name / person-event translations directly into the DB
(msg_key + msg tables). No HTTP, no permissions needed.

Run from anywhere:

    python backend/seeds/seed_person_name_translations.py

Safe to run repeatedly — insert-only, never overwrites an existing value.
lang_id 2 = English, lang_id 3 = Ukrainian.
"""

import asyncio
import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from sqlalchemy import select

from backend.api_v1.msg_key.msg_key_model import MsgKey
from backend.api_v1.msg_pg.msg_model import Msg
from backend.database.db_helper import db_helper

# (name, eng_value, ukr_value)
TRANSLATIONS: list[tuple[str, str, str]] = [
    # ── App setting: name order (developer Settings + per-user /settings) ──
    (
        "settingSurnameFirstInNames",
        "Surname first in names",
        "Прізвище першим в іменах",
    ),
    (
        "settingSurnameFirstInNamesDesc",
        "When ON, names are shown as 'Surname Name'; when OFF, as 'Name Surname'. "
        "Each user may set their own order — it changes only what you see, never "
        "the stored data.",
        "Коли увімкнено, імена показуються як 'Прізвище Ім'я'; коли вимкнено — "
        "'Ім'я Прізвище'. Кожен користувач може обрати власний порядок — це "
        "змінює лише те, що бачите ви, а не збережені дані.",
    ),
    # ── App setting: surname-change policy ──
    (
        "settingPersonLastNameChangeFemaleOnly",
        "Surname change for women only",
        "Зміна прізвища лише для жінок",
    ),
    (
        "settingPersonLastNameChangeFemaleOnlyDesc",
        "When ON, a surname-change event may only be recorded for a person whose "
        "sex is female. When OFF, it may be recorded for anyone.",
        "Коли увімкнено, подію зміни прізвища можна зареєструвати лише для особи "
        "жіночої статі. Коли вимкнено — для будь-кого.",
    ),
    # ── Backend — person event errors ──
    (
        "personEventNotFound",
        "Event with ID ${eventId} not found",
        "Подію з ID ${eventId} не знайдено",
    ),
    (
        "personEventTypeNotFound",
        "Event type '${key}' not found",
        "Тип події '${key}' не знайдено",
    ),
    (
        "personEventNotPermittedForSex",
        "A surname change may only be recorded for a woman",
        "Зміну прізвища можна зареєструвати лише для жінки",
    ),
    (
        "personEventSexUnknown",
        "Set the person's sex before recording a surname change",
        "Спочатку вкажіть стать особи, а потім реєструйте зміну прізвища",
    ),
    (
        "personEventOutOfScope",
        "This person is outside your scope",
        "Ця особа поза межами вашої зони відповідальності",
    ),
    (
        "personEventInvalidTransition",
        "Cannot move the event from '${current}' to '${target}'",
        "Не можна перевести подію з '${current}' у '${target}'",
    ),
    (
        "personEventNotEditable",
        "An applied event can no longer be edited or deleted",
        "Застосовану подію більше не можна змінити або видалити",
    ),
    # ── Backend — person event success ──
    ("personEventCreateSuccess", "Event recorded", "Подію зареєстровано"),
    (
        "personEventStatusChangeSuccess",
        "Event moved to '${status}'",
        "Подію переведено у '${status}'",
    ),
    ("personEventDeleteSuccess", "Event deleted", "Подію видалено"),
    # ── Frontend — surname change dialog + history ──
    ("lastNameChange", "Surname change", "Зміна прізвища"),
    ("lastNameHistory", "Surname history", "Історія прізвища"),
    ("newLastName", "New surname", "Нове прізвище"),
    ("changedSince", "Changed since", "Змінено з"),
    ("recordLastNameChange", "Record a surname change", "Зареєструвати зміну прізвища"),
    ("newLastNameRequired", "New surname is required", "Нове прізвище обов'язкове"),
    ("changedSinceRequired", "Date is required", "Дата обов'язкова"),
    (
        "noLastNameChanges",
        "No surname changes recorded",
        "Змін прізвища не зареєстровано",
    ),
    # ── Backend — employee errors ──
    (
        "employeePersonRequired",
        "A person must be created before the employee: name parts are stored on "
        "the person record.",
        "Спочатку потрібно створити особу, а потім працівника: частини імені "
        "зберігаються в записі особи.",
    ),
]


async def seed_translations():
    async with db_helper.session_factory() as session:
        result = await session.execute(select(MsgKey.name, MsgKey.id))
        existing_keys: dict[str, int] = {row[0]: row[1] for row in result.all()}

        new_keys = 0
        for name, _, _ in TRANSLATIONS:
            if name in existing_keys:
                continue
            session.add(MsgKey(name=name))
            new_keys += 1
        await session.flush()

        if new_keys:
            result = await session.execute(select(MsgKey.name, MsgKey.id))
            existing_keys = {row[0]: row[1] for row in result.all()}

        result = await session.execute(select(Msg.msg_key_id, Msg.lang_id))
        existing_pairs: set[tuple[int, int]] = {
            (row[0], row[1]) for row in result.all()
        }

        new_msgs = 0
        for name, eng_val, ukr_val in TRANSLATIONS:
            key_id = existing_keys.get(name)
            if key_id is None:
                continue
            for lang_id, value in ((2, eng_val), (3, ukr_val)):
                if (key_id, lang_id) not in existing_pairs:
                    session.add(Msg(msg_key_id=key_id, lang_id=lang_id, value=value))
                    new_msgs += 1

        await session.commit()

        print(f"msg_keys: {new_keys} inserted")
        print(f"msgs:     {new_msgs} inserted")
        if new_keys == 0 and new_msgs == 0:
            print("All translations already present — nothing to do.")


if __name__ == "__main__":
    asyncio.run(seed_translations())
