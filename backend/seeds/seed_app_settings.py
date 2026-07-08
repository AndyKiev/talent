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
        # v1 demo of per-user override: the global value (5) is both the default
        # and the cap — a user may pick 1..5 for their own plan.
        "user_overridable": True,
    },
    {
        "key": "idp_allow_full_competence_list",
        "value": False,
        "value_type_key": "boolean",
        "label_key": "settingIdpAllowFullCompetenceList",
        "description_key": "settingIdpAllowFullCompetenceListDesc",
    },
    {
        # When ON, each review exposes a per-review switch (to the employee and
        # their oversight manager) that makes the two competence-summary selects
        # offer the FULL competence list instead of only the top/bottom ranked
        # ones — and while that switch is on, a star re-rating no longer removes a
        # picked competence + its facts. When OFF (default) the switch is hidden
        # and the summary behaves as before (ranked shortlist + flip removal).
        "key": "people_review_summary_full_competence_list",
        "value": False,
        "value_type_key": "boolean",
        "label_key": "settingPeopleReviewSummaryFullCompetenceList",
        "description_key": "settingPeopleReviewSummaryFullCompetenceListDesc",
        # App-only: this gates a per-review switch, not a per-user preference.
        "user_override_allowed": False,
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
        # When ON the employee registration form shows an optional talent
        # section under the job select: pick one or more talent target jobs
        # (department type → target job → talent status/period) and they are
        # created on the fly as a talent_audit + talent_audit_job(s) for the
        # new employee. Interviews are out of scope here — only the audit.
        "key": "employee_create_allow_talent_period",
        "value": False,
        "value_type_key": "boolean",
        "label_key": "settingEmployeeCreateAllowTalentPeriod",
        "description_key": "settingEmployeeCreateAllowTalentPeriodDesc",
    },
    {
        # Review-session fill filter: only employees whose job's category is in
        # this list are added to a NEWLY OPENED session. Employees whose job has
        # no category link (or no job) are ALWAYS included. Stored as a JSON list
        # of job_category keys. App-only (never user-overridable); edited via a
        # multi-select in developer Settings (options_source = job_categories).
        "key": "review_session_filter_job_categories",
        "value": ["manager"],
        "value_type_key": "json",
        "label_key": "settingReviewSessionFilterJobCategories",
        "description_key": "settingReviewSessionFilterJobCategoriesDesc",
        "options_source": "job_categories",
        "user_override_allowed": False,
    },
    {
        # Review-session fill filter: only employees whose status is in this list
        # are added to a newly opened session. Stored as a JSON list of status
        # names. App-only; multi-select (options_source = employee_statuses).
        "key": "review_session_filter_employee_statuses",
        "value": ["working"],
        "value_type_key": "json",
        "label_key": "settingReviewSessionFilterEmployeeStatuses",
        "description_key": "settingReviewSessionFilterEmployeeStatusesDesc",
        "options_source": "employee_statuses",
        "user_override_allowed": False,
    },
    {
        # Optional-essence-property: when ON, creating a job (single create OR
        # Excel bulk upload) auto-links the default 'manager' job category via a
        # job_job_category_links row. When OFF new jobs get no category link;
        # existing links are untouched. App-level only (not user-overridable).
        "key": "job_apply_category_on_create",
        "value": True,
        "value_type_key": "boolean",
        "label_key": "settingJobApplyCategoryOnCreate",
        "description_key": "settingJobApplyCategoryOnCreateDesc",
    },
    {
        # When ON the login page shows a "Register" option: a person with no
        # employee record can self-register (code + name + email on an allowed
        # domain) and lands as is_active=true / status "pending" / no job.
        # When OFF (default) the public /jwt/register endpoint refuses and the
        # login page shows only the regular login form. App-only.
        "key": "self_registration_enabled",
        "value": False,
        "value_type_key": "boolean",
        "label_key": "settingSelfRegistrationEnabled",
        "description_key": "settingSelfRegistrationEnabledDesc",
        "user_override_allowed": False,
    },
    {
        # MASTER of the employee-photos feature. When OFF the whole feature is
        # dormant: the frontend hides all avatars and never reads photos, uploads
        # are rejected, and the TEMPO artifacts skip the photo (sheds the heavy
        # read load). Default ON to preserve current behaviour. Stored blobs are
        # kept, so flipping back ON restores every photo; deleting an employee
        # still removes their photo (FK CASCADE). The five children below let the
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
    {
        "key": "employee_photos_presentation_pptx",
        "value": True,
        "value_type_key": "boolean",
        "parent_key": "employee_photos_enabled",
        "label_key": "settingEmployeePhotosPresentationPptx",
        "description_key": "settingEmployeePhotosPresentationPptxDesc",
    },
    {
        # TEMPO artifacts (PDF / individual HTML / presentation HTML / PPTX):
        # show the proposed-level block when the proposed level is the BASIC
        # (lowest) level. Off hides the whole proposal (identity field +
        # requirements slide/section) for such registrations. Per-user override.
        "key": "tempo_show_proposed_level_basic",
        "value": True,
        "value_type_key": "boolean",
        "label_key": "settingTempoShowProposedLevelBasic",
        "description_key": "settingTempoShowProposedLevelBasicDesc",
        "user_overridable": True,
    },
    {
        # Same gate for a proposed level EQUAL to the employee's current level
        # (a confirmation): off hides the proposal block in every TEMPO artifact.
        "key": "tempo_show_proposed_level_same",
        "value": True,
        "value_type_key": "boolean",
        "label_key": "settingTempoShowProposedLevelSame",
        "description_key": "settingTempoShowProposedLevelSameDesc",
        "user_overridable": True,
    },
    {
        # The menu (menus table id) users land on after login. App default here;
        # each user may override it in /settings with any menu THEY can see —
        # if the chosen menu later disappears from their access, the override
        # auto-resets. Single-select in the UI (options_source = menus).
        "key": "default_menu",
        "value": 1,  # menus.id of 'employees'
        "value_type_key": "integer",
        "label_key": "settingDefaultMenu",
        "description_key": "settingDefaultMenuDesc",
        "user_overridable": True,
        "options_source": "menus",
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
                    user_overridable=s.get("user_overridable", False),
                    options_source=s.get("options_source"),
                    user_override_allowed=s.get("user_override_allowed", True),
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
