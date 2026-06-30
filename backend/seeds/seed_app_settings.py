from pathlib import Path
import sys

_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

import asyncio

from sqlalchemy import select

from backend.database.db_helper import db_helper
from backend.api_v1.setting_value_type.setting_value_type_model import SettingValueType
from backend.api_v1.app_setting.app_setting_model import AppSetting


# Value types — the catalog that says how to read a setting's JSON value.
VALUE_TYPES = [
    {"key": "boolean", "name": "Boolean"},
    {"key": "integer", "name": "Integer"},
    {"key": "date", "name": "Date"},
    {"key": "json", "name": "JSON / config"},
]

# Initial settings. label_key / description_key are translation keys resolved
# in the developer UI via getString.
APP_SETTINGS = [
    {
        "key": "people_review_edit_talent_status",
        "value": False,
        "value_type_key": "boolean",
        "label_key": "settingPeopleReviewEditTalentStatus",
        "description_key": "settingPeopleReviewEditTalentStatusDesc",
    },
    {
        "key": "idp_min_missions",
        "value": 1,
        "value_type_key": "integer",
        "label_key": "settingIdpMinMissions",
        "description_key": "settingIdpMinMissionsDesc",
    },
    {
        "key": "idp_max_missions",
        "value": 5,
        "value_type_key": "integer",
        "label_key": "settingIdpMaxMissions",
        "description_key": "settingIdpMaxMissionsDesc",
    },
    {
        "key": "idp_allow_full_competence_list",
        "value": False,
        "value_type_key": "boolean",
        "label_key": "settingIdpAllowFullCompetenceList",
        "description_key": "settingIdpAllowFullCompetenceListDesc",
    },
    {
        # When OFF the base level is only DISPLAYED for an employee with no current
        # level; when ON it is persisted to the employee record (and re-read).
        "key": "employee_default_level_persist",
        "value": False,
        "value_type_key": "boolean",
        "label_key": "settingEmployeeDefaultLevelPersist",
        "description_key": "settingEmployeeDefaultLevelPersistDesc",
    },
    {
        # When ON the session creation form displays a department picker
        # (category → instances). The picked department is saved as a
        # review_session_departments link. When opening the session, only
        # employees whose main department matches the linked department are
        # included.
        "key": "review_session_filter_by_department",
        "value": False,
        "value_type_key": "boolean",
        "label_key": "settingReviewSessionFilterByDepartment",
        "description_key": "settingReviewSessionFilterByDepartmentDesc",
    },
    {
        # MASTER of the employee-photos feature. When OFF the whole feature is
        # dormant: the frontend hides all avatars and never reads photos, uploads
        # are rejected, and the TEMPO artifacts skip the photo (sheds the heavy
        # read load). Default ON to preserve current behaviour. Stored blobs are
        # kept, so flipping back ON restores every photo; deleting an employee
        # still removes their photo (FK CASCADE). The four children below let the
        # photo DISPLAY be switched per surface — each is "effectively on" only
        # when it AND this master are on.
        "key": "employee_photos_enabled",
        "value": True,
        "value_type_key": "boolean",
        "label_key": "settingEmployeePhotosEnabled",
        "description_key": "settingEmployeePhotosEnabledDesc",
    },
    # ── Children (multi-story): per-surface photo DISPLAY toggles. parent_key
    #    links them under the master; default ON so master-ON restores everything.
    {
        "key": "employee_photos_employees_menu",
        "value": True,
        "value_type_key": "boolean",
        "parent_key": "employee_photos_enabled",
        "label_key": "settingEmployeePhotosEmployeesMenu",
        "description_key": "settingEmployeePhotosEmployeesMenuDesc",
    },
    {
        "key": "employee_photos_people_review",
        "value": True,
        "value_type_key": "boolean",
        "parent_key": "employee_photos_enabled",
        "label_key": "settingEmployeePhotosPeopleReview",
        "description_key": "settingEmployeePhotosPeopleReviewDesc",
    },
    {
        "key": "employee_photos_presentation_session",
        "value": True,
        "value_type_key": "boolean",
        "parent_key": "employee_photos_enabled",
        "label_key": "settingEmployeePhotosPresentationSession",
        "description_key": "settingEmployeePhotosPresentationSessionDesc",
    },
    {
        "key": "employee_photos_presentation_individual",
        "value": True,
        "value_type_key": "boolean",
        "parent_key": "employee_photos_enabled",
        "label_key": "settingEmployeePhotosPresentationIndividual",
        "description_key": "settingEmployeePhotosPresentationIndividualDesc",
    },
]


async def seed_app_settings():
    async with db_helper.session_factory() as session:
        # 1) Value types
        type_by_key: dict[str, SettingValueType] = {}
        for vt in VALUE_TYPES:
            result = await session.execute(
                select(SettingValueType).where(SettingValueType.key == vt["key"])
            )
            existing = result.scalar_one_or_none()
            if not existing:
                existing = SettingValueType(key=vt["key"], name=vt["name"])
                session.add(existing)
                await session.flush()
                print(f"Seeded value type: {vt['key']}")
            type_by_key[vt["key"]] = existing

        # 2) Settings (insert missing; parent_id wired in a second pass below).
        for s in APP_SETTINGS:
            result = await session.execute(
                select(AppSetting).where(AppSetting.key == s["key"])
            )
            if result.scalar_one_or_none():
                print(f"App setting '{s['key']}' already seeded, skipping.")
                continue
            session.add(
                AppSetting(
                    key=s["key"],
                    value=s["value"],
                    value_type_id=type_by_key[s["value_type_key"]].id,
                    label_key=s["label_key"],
                    description_key=s["description_key"],
                )
            )
            print(f"Seeded app setting: {s['key']}")
        await session.flush()

        # 3) Wire parent_id from parent_key (idempotent — only sets when unset).
        result = await session.execute(select(AppSetting.key, AppSetting.id))
        id_by_key = {row[0]: row[1] for row in result.all()}
        for s in APP_SETTINGS:
            parent_key = s.get("parent_key")
            if not parent_key:
                continue
            child = await session.scalar(
                select(AppSetting).where(AppSetting.key == s["key"])
            )
            parent_id = id_by_key.get(parent_key)
            if child is not None and parent_id and child.parent_id != parent_id:
                child.parent_id = parent_id
                print(f"Linked '{s['key']}' -> parent '{parent_key}'")

        await session.commit()


if __name__ == "__main__":
    asyncio.run(seed_app_settings())
