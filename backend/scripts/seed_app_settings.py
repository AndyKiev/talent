"""Idempotent setup of the talent-alignment admin parameter + its translations.

Creates (if missing) the `allow_unaligned_events` app setting and the UK+EN
translations it (and the related backend block message) need:

  * app_settings row  `allow_unaligned_events`  (boolean, default value = True)
      - True  (default): job-change events (any event carrying a JOB_CHANGE)
        that don't match the employee's talent plan are ALLOWED.
      - False: the backend BLOCKS such events with a message naming this setting.
  * msg keys (msg_key / msg, ukr=3 / eng=2):
      - allow_unaligned_events_label / _desc  (the developer-tab UI)
      - employeeEventJobNotAlignedWithTalent  (the block message; ${jobId}/${setting})

The backend guard (EmployeeEventService._assert_job_change_aligned_with_talent)
defaults to ALLOW when this row is absent, so the app keeps working even before
this runs; running it makes the toggle visible/editable in the admin tab and
ensures the messages resolve.

Idempotent: the setting row is left untouched if it already exists (so an admin's
chosen value is preserved); translations are upserted (value refreshed).

Run from `backend/` with the poetry venv:
    poetry run python scripts/seed_app_settings.py
or from the repo root:
    poetry run python -m backend.scripts.seed_app_settings
"""

import asyncio
import os
import sys

sys.path.insert(
    0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)

from backend.api_v1.app_setting.app_setting_model import AppSetting
from backend.api_v1.employee.employee_model import Employee
from backend.api_v1.msg_key.msg_key_model import MsgKey
from backend.api_v1.msg_pg.msg_model import Msg
from backend.api_v1.setting_value_type.setting_value_type_model import (
    SettingValueType,
)
from backend.database.db_helper import db_helper
from sqlalchemy import select

ADMIN_CODE = "UKR7101004"
LANG_UKR = 3
LANG_ENG = 2

SETTING_KEY = "allow_unaligned_events"
LABEL_KEY = "allow_unaligned_events_label"
DESC_KEY = "allow_unaligned_events_desc"
BLOCK_MSG_KEY = "employeeEventJobNotAlignedWithTalent"

# key -> {ukr, eng}
TRANSLATIONS = {
    LABEL_KEY: {
        "ukr": "Дозволяти події, не узгоджені зі статусом таланту",
        "eng": "Allow events not aligned with talent status",
    },
    DESC_KEY: {
        "ukr": (
            "Якщо увімкнено (за замовчуванням) — події зі зміною посади "
            "(JOB_CHANGE), що не входять до плану талантів працівника, "
            "дозволені. Якщо вимкнено — такі події блокуються."
        ),
        "eng": (
            "When ON (default), job-change events (carrying a JOB_CHANGE) that "
            "are not in the employee's talent plan are allowed. When OFF, such "
            "events are blocked."
        ),
    },
    BLOCK_MSG_KEY: {
        "ukr": (
            "Цю подію не можна створити: посада #${jobId} не входить до плану "
            "талантів працівника. Створення подій зі зміною посади, не "
            "узгоджених зі статусом таланту, вимкнено налаштуванням "
            "'${setting}'. Адміністратор може увімкнути це налаштування, щоб "
            "дозволити."
        ),
        "eng": (
            "This event cannot be created: job #${jobId} is not in the "
            "employee's talent plan. Creating job-change events that are not "
            "aligned with talent status is disabled by the '${setting}' "
            "setting — an admin can enable it to allow this."
        ),
    },
}


async def _upsert_translation(session, key: str, ukr: str, eng: str) -> bool:
    """Create the msg_key (if missing) and upsert ukr+eng msg rows. Returns True
    if anything was created/changed."""
    changed = False
    msg_key = (
        await session.execute(select(MsgKey).where(MsgKey.name == key))
    ).scalar_one_or_none()
    if msg_key is None:
        msg_key = MsgKey(name=key)
        session.add(msg_key)
        await session.flush()  # assign id
        changed = True
    for lang_id, value in ((LANG_UKR, ukr), (LANG_ENG, eng)):
        row = (
            await session.execute(
                select(Msg).where(
                    Msg.msg_key_id == msg_key.id, Msg.lang_id == lang_id
                )
            )
        ).scalar_one_or_none()
        if row is None:
            session.add(Msg(value=value, msg_key_id=msg_key.id, lang_id=lang_id))
            changed = True
        elif row.value != value:
            row.value = value
            changed = True
    return changed


async def main() -> None:
    async with db_helper.session_factory() as session:
        # Resolve boolean value-type + admin (for created_by).
        bool_type = (
            await session.execute(
                select(SettingValueType).where(SettingValueType.key == "boolean")
            )
        ).scalar_one_or_none()
        if bool_type is None:
            raise SystemExit("setting_value_type 'boolean' not found — seed it first.")
        admin = (
            await session.execute(select(Employee).where(Employee.code == ADMIN_CODE))
        ).scalar_one_or_none()
        admin_id = admin.id if admin else None

        # 1) app_settings row — create only if missing (preserve admin's value).
        existing = (
            await session.execute(
                select(AppSetting).where(AppSetting.key == SETTING_KEY)
            )
        ).scalar_one_or_none()
        if existing is None:
            session.add(
                AppSetting(
                    key=SETTING_KEY,
                    value=True,  # default: allow unaligned events
                    value_type_id=bool_type.id,
                    label_key=LABEL_KEY,
                    description_key=DESC_KEY,
                    is_active=True,
                    created_by=admin_id,
                )
            )
            setting_action = "created"
        else:
            setting_action = f"kept (value={existing.value})"

        # 2) translations (upsert).
        tx_changed = 0
        for key, t in TRANSLATIONS.items():
            if await _upsert_translation(session, key, t["ukr"], t["eng"]):
                tx_changed += 1

        await session.commit()

    print(
        f"app_setting '{SETTING_KEY}': {setting_action}; "
        f"translations upserted/changed: {tx_changed}/{len(TRANSLATIONS)} keys."
    )


if __name__ == "__main__":
    asyncio.run(main())
