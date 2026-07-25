"""
Insert job-process-role-link translations directly into the DB
(msg_key + msg tables). No HTTP, no permissions needed.

Run from anywhere:

    python backend/seeds/seed_job_process_role_translations.py

Safe to run repeatedly — skips keys that already exist.
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
    # ── Backend — job_process_role_link errors ──
    (
        "jobProcessRoleLinkNotFound",
        "Link between job ID ${jobId} and process role ID ${processRoleId} not found",
        "Зв'язок між посадою ID ${jobId} та роллю процесу ID ${processRoleId} не знайдено",
    ),
    (
        "jobAlreadyLinkedToProcessRole",
        "Job '${jobName}' is already linked to '${processName} / ${roleName}'",
        "Посада '${jobName}' вже пов'язана з '${processName} / ${roleName}'",
    ),
    (
        "jobProcessRoleLinkDeleteError",
        "Job process role link '${name}' cannot be deleted because it is referenced by other records",
        "Зв'язок посади з роллю процесу '${name}' не можна видалити, оскільки він використовується іншими записами",
    ),
    (
        "jobNotFoundForProcessRoleLink",
        "Job with ID ${jobId} not found",
        "Посаду з ID ${jobId} не знайдено",
    ),
    (
        "processRoleNotFoundForLink",
        "Process role with ID ${processRoleId} not found",
        "Роль процесу з ID ${processRoleId} не знайдено",
    ),
    # ── Backend — job_process_role_link success ──
    (
        "jobProcessRoleLinkCreateSuccess",
        "Job '${jobName}' successfully linked to process role '${processName} / ${roleName}'",
        "Посаду '${jobName}' успішно пов'язано з роллю процесу '${processName} / ${roleName}'",
    ),
    (
        "jobProcessRoleLinkDeleteSuccess",
        "Job '${jobName}' successfully removed from process role '${processName} / ${roleName}'",
        "Посаду '${jobName}' успішно від'єднано від ролі процесу '${processName} / ${roleName}'",
    ),
    # ── Frontend — dialog / column labels ──
    (
        "assignedProcessRoles",
        "Assigned process roles",
        "Призначені ролі процесів",
    ),
    (
        "noProcessRolesAssigned",
        "No process roles assigned.",
        "Ролі процесів не призначено.",
    ),
    (
        "noProcessRoles",
        "No process roles",
        "Немає ролей процесів",
    ),
    (
        "processRoles",
        "Process Roles",
        "Ролі процесів",
    ),
    (
        "processRolesForJob",
        "Process Roles",
        "Ролі процесів",
    ),
    (
        "addProcessRole",
        "Add process role",
        "Додати роль процесу",
    ),
]


async def seed_translations():
    async with db_helper.session_factory() as session:
        # ── Load existing msg_keys ─────────────────────────────────────
        result = await session.execute(select(MsgKey.name, MsgKey.id))
        existing_keys: dict[str, int] = {row[0]: row[1] for row in result.all()}

        # ── Insert missing msg_keys ────────────────────────────────────
        new_keys = 0
        for name, _, _ in TRANSLATIONS:
            if name in existing_keys:
                continue
            mk = MsgKey(name=name)
            session.add(mk)
            new_keys += 1
        await session.flush()

        # Re-fetch to get IDs for newly inserted keys
        if new_keys:
            result = await session.execute(select(MsgKey.name, MsgKey.id))
            existing_keys = {row[0]: row[1] for row in result.all()}

        # ── Load existing msgs (msg_key_id, lang_id) pairs ─────────────
        result = await session.execute(select(Msg.msg_key_id, Msg.lang_id))
        existing_pairs: set[tuple[int, int]] = {(row[0], row[1]) for row in result.all()}

        # ── Insert missing msgs ────────────────────────────────────────
        new_msgs = 0
        updated_msgs = 0
        for name, eng_val, ukr_val in TRANSLATIONS:
            key_id = existing_keys.get(name)
            if key_id is None:
                continue

            # English (lang_id=2)
            if (key_id, 2) not in existing_pairs:
                session.add(Msg(msg_key_id=key_id, lang_id=2, value=eng_val))
                new_msgs += 1
            else:
                # Update existing — guard against partial/broken state
                stmt = select(Msg).where(Msg.msg_key_id == key_id, Msg.lang_id == 2)
                r = await session.execute(stmt)
                existing = r.scalar_one_or_none()
                if existing and existing.value != eng_val:
                    existing.value = eng_val
                    updated_msgs += 1

            # Ukrainian (lang_id=3)
            if (key_id, 3) not in existing_pairs:
                session.add(Msg(msg_key_id=key_id, lang_id=3, value=ukr_val))
                new_msgs += 1
            else:
                stmt = select(Msg).where(Msg.msg_key_id == key_id, Msg.lang_id == 3)
                r = await session.execute(stmt)
                existing = r.scalar_one_or_none()
                if existing and existing.value != ukr_val:
                    existing.value = ukr_val
                    updated_msgs += 1

        await session.commit()

        print(f"msg_keys: {new_keys} inserted")
        print(f"msgs:     {new_msgs} inserted, {updated_msgs} updated")
        if new_keys == 0 and new_msgs == 0 and updated_msgs == 0:
            print("All translations already present — nothing to do.")


if __name__ == "__main__":
    asyncio.run(seed_translations())
