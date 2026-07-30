"""
Insert developer DB-tables page description translations directly into the DB
(msg_key + msg tables). No HTTP, no permissions needed.

    python backend/seeds/seed_db_table_desc_translations.py

One dbTableDesc<PascalTableName> key per table. English values come straight
from the service's in-code fallback dict (TABLE_DESCRIPTIONS_EN in
backend/api_v1/db_table_info/db_table_info_service.py) so the two never drift;
Ukrainian values live here. auto_describe resolves these keys to the
requesting user's language.

Insert-only — never overwrites existing keys. lang_id 2 = English, 3 = Ukrainian.
"""

import asyncio
import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from sqlalchemy import select

from backend.api_v1.db_table_info.db_table_info_service import (
    TABLE_DESCRIPTIONS_EN,
    DbTableInfoService,
)
from backend.api_v1.msg_key.msg_key_model import MsgKey
from backend.api_v1.msg_pg.msg_model import Msg
from backend.database.db_helper import db_helper

# table_name -> Ukrainian description (English comes from TABLE_DESCRIPTIONS_EN)
TABLE_DESCRIPTIONS_UKR: dict[str, str] = {
    "access_test_contexts": "Контексти тестування доступу (режим розробника)",
    "app_setting_user_group_links": "Зв'язки налаштування–група користувачів",
    "app_settings": "Налаштування застосунку (ключ–значення)",
    "recruitment_application_status_changes": "Історія статусів заявок кандидатів",
    "recruitment_applications": "Заявки кандидатів (картки канбану)",
    "recruitment_candidate_notes": "Нотатки про кандидатів",
    "recruitment_candidate_phones": "Телефони кандидатів",
    "recruitment_candidate_sources": "Джерела кандидатів",
    "candidates": "Кандидати",
    "change_log": "Записи журналу змін",
    "change_session": "Сесії аудиту змін",
    "department_categories": "Категорії департаментів",
    "department_job_targets": "Цільові показники посад департаменту",
    "department_region_links": "Зв'язки департамент–регіон",
    "department_type_job_links": "Зв'язки тип департаменту–посада",
    "department_type_parental_links": "Батьківські зв'язки типів департаментів",
    "department_types": "Типи департаментів",
    "departments": "Департаменти / підрозділи",
    "education_degrees": "Наукові ступені / рівні освіти",
    "employee_children": "Діти працівників",
    "employee_current_levels": "Поточні рівні (грейди) працівників",
    "employee_departments": "Основний департамент працівника",
    "employee_educations": "Освіта працівників",
    "employee_event_change_departments": "Департаменти, змінені в подіях",
    "employee_event_changes": "Зміни в кадрових подіях",
    "employee_event_direction_types": "Типи напрямів кадрових подій",
    "employee_event_statuses": "Статуси кадрових подій",
    "employee_event_type_directions": "Зв'язки тип–напрям кадрових подій",
    "employee_event_types": "Типи кадрових подій",
    "employee_events": "Кадрові події працівників",
    "employee_language_profiles": "Мовні профілі (рівень персони)",
    "employee_languages": "Окремі мови персони",
    "employee_origins": "Походження працівників (людина / робот)",
    "employee_personal_data": "Персональні дані працівників",
    "employee_photos": "Фотографії працівників",
    "employee_responsibility_departments": "Департаменти відповідальності працівника",
    "employee_statuses": "Статуси працівників",
    "employee_training_statuses": "Статуси навчань працівників",
    "employee_trainings": "Призначені навчання працівників",
    "employee_user_group_links": "Зв'язки працівник–група користувачів",
    "employees": "Працівники",
    "essence_set_members": "Члени наборів сутностей",
    "essence_sets": "Набори сутностей",
    "essences": "Сутності системи (для ACL)",
    "hrm_scopes": "Області HRM-доступу",
    "recruitment_interview_feedbacks": "Відгуки про співбесіди",
    "recruitment_interview_interviewers": "Зв'язки співбесіда–інтерв'юер",
    "interviews": "Співбесіди з кандидатами",
    "job_categories": "Категорії посад",
    "job_group_types": "Типи груп посад",
    "job_groups": "Групи посад",
    "job_job_category_links": "Зв'язки посада–категорія посад",
    "job_job_group_links": "Зв'язки посада–група посад",
    "job_process_role_link_department_types": (
        "Типи департаментів зв'язків посада–роль процесу"
    ),
    "job_process_role_links": "Зв'язки посада–роль процесу",
    "job_requirement_groups": "Групи вимог до посад",
    "job_requirement_items": "Пункти вимог до посад",
    "job_user_group_links": "Зв'язки посада–група користувачів",
    "jobs": "Посади",
    "langs": "Мови інтерфейсу",
    "language_levels": "Рівні володіння мовою",
    "marital_statuses": "Сімейні стани",
    "menu_user_group_links": "Зв'язки меню–група користувачів",
    "menus": "Пункти головного меню",
    "msg_keys": "Ключі повідомлень",
    "msgs": "Повідомлення перекладів",
    "operation_essence_links": "Зв'язки операція–сутність",
    "operation_essence_set_links": "Зв'язки операція–набір сутностей",
    "operation_user_group_links": "Зв'язки операція–група користувачів",
    "operations": "Операції (дії в системі)",
    "persons": "Персони (спільна особа працівника і кандидата)",
    "recruitment_application_statuses": "Статуси рекрутингового конвеєра (колонки канбану)",
    "plan_category_defaults": "Категорії планування за замовчуванням",
    "plan_scope_defaults": "Області охоплення планування за замовчуванням",
    "plan_scopes": "Області охоплення планування",
    "plan_session_categories": "Категорії сесії планування",
    "plan_session_statuses": "Статуси сесій планування",
    "plan_sessions": "Сесії планування наступності",
    "process_role_active_contexts": "Активні контексти ролей процесів",
    "process_role_holder_department_links": "Зв'язки власник ролі–департамент",
    "process_role_holder_employee_links": "Зв'язки власник ролі–працівник",
    "process_role_holders": "Власники ролей процесів",
    "process_roles": "Ролі в бізнес-процесах",
    "processes": "Бізнес-процеси",
    "recruitment_dimensions": "Виміри оцінювання рекрутингу",
    "recruitment_task_statuses": "Статуси рекрутингових завдань",
    "recruitment_tasks": "Рекрутингові завдання (вакансії)",
    "regions": "Регіони",
    "review_dimension_criterias": "Критерії вимірів оцінювання",
    "review_dimensions": "Виміри оцінювання People Review",
    "review_level_requirements": "Вимоги до рівнів компетенцій",
    "review_levels": "Рівні компетенцій (грейди)",
    "review_session_criterions": "Критерії, прив'язані до сесії оцінювання",
    "review_session_departments": "Зв'язки сесія оцінювання–департамент",
    "review_session_employee_comments": "Коментарі до оцінок працівників",
    "review_session_employee_criterion_scores": "Бали працівників за критеріями",
    "review_session_employee_evaluations": "Оцінки працівників у сесії",
    "review_session_employee_level_answers": (
        "Відповіді (факти) за рівнями компетенцій"
    ),
    "review_session_employee_levels": "Запропоновані рівні працівників у сесії",
    "review_session_employees": "Працівники — учасники сесії оцінювання",
    "review_session_level_requirements": "Вимоги рівнів, заморожені в сесії",
    "review_session_levels": "Рівні оцінювання, заморожені в сесії",
    "review_session_settings": "Налаштування сесії оцінювання",
    "review_session_statuses": "Статуси сесій оцінювання",
    "review_sessions": "Сесії оцінювання People Review",
    "setting_value_types": "Типи значень налаштувань",
    "sexes": "Статі",
    "talent_audit": "Аудити талантів",
    "talent_audit_interview": "Інтерв'ю аудиту талантів",
    "talent_audit_interview_job": "Посади в інтерв'ю аудиту",
    "talent_audit_interview_statuses": "Статуси інтерв'ю аудиту талантів",
    "talent_audit_job": "Цільові посади в аудиті талантів",
    "talent_audit_job_statuses": "Статуси цільових посад аудиту",
    "talent_audit_statuses": "Статуси аудиту талантів",
    "talent_periods": "Періоди оцінювання талантів",
    "talent_status_period_link": "Зв'язки статус–період талантів",
    "talent_statuses": "Статуси талантів",
    "training_categories": "Категорії навчань",
    "training_link_types": "Типи зв'язків навчань",
    "training_type_job_category_links": "Зв'язки тип навчання–категорія посад",
    "training_type_job_links": "Зв'язки тип навчання–посада",
    "training_types": "Типи навчань",
    "user_group_operation_essence_links": "Права груп на сутності",
    "user_group_operation_essence_set_links": "Права груп на набори сутностей",
    "user_group_types": "Типи груп користувачів",
    "user_groups": "Групи користувачів",
    "user_settings": "Користувацькі перевизначення налаштувань",
}


def _build_translations() -> list[tuple[str, str, str]]:
    """(msg_key_name, eng, ukr) per table; warn when a ukr value is missing
    (the key + eng row are still seeded — translate_keys falls back to the
    English in-code value for the missing language)."""
    rows: list[tuple[str, str, str]] = []
    for table_name, eng_val in TABLE_DESCRIPTIONS_EN.items():
        ukr_val = TABLE_DESCRIPTIONS_UKR.get(table_name, "")
        if not ukr_val:
            print(f"[WARN] no Ukrainian description for table '{table_name}'")
        rows.append((DbTableInfoService._desc_msg_key(table_name), eng_val, ukr_val))
    for table_name in TABLE_DESCRIPTIONS_UKR:
        if table_name not in TABLE_DESCRIPTIONS_EN:
            print(f"[WARN] ukr-only table '{table_name}' missing in TABLE_DESCRIPTIONS_EN")
    return rows


async def seed_translations():
    translations = _build_translations()
    async with db_helper.session_factory() as session:
        result = await session.execute(select(MsgKey.name, MsgKey.id))
        existing_keys: dict[str, int] = {row[0]: row[1] for row in result.all()}

        new_keys = 0
        for name, _, _ in translations:
            if name in existing_keys:
                continue
            session.add(MsgKey(name=name))
            new_keys += 1
        await session.flush()

        if new_keys:
            result = await session.execute(select(MsgKey.name, MsgKey.id))
            existing_keys = {row[0]: row[1] for row in result.all()}

        result = await session.execute(select(Msg.msg_key_id, Msg.lang_id))
        existing_pairs: set[tuple[int, int]] = {(row[0], row[1]) for row in result.all()}

        new_msgs = 0
        for name, eng_val, ukr_val in translations:
            key_id = existing_keys.get(name)
            if key_id is None:
                continue
            for lang_id, value in ((2, eng_val), (3, ukr_val)):
                if not value:
                    continue
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
