"""
Seeder: insert missing UI translation keys (msg_keys + msgs) for the
people-review evaluation page — flip-competence dialog, sex/marital labels,
education degrees, language levels, children, and TEMPO competence names.

Safe to run repeatedly: skips keys that already exist.
Inserts BOTH English (lang_id=2) and Ukrainian (lang_id=3).

Run:
    cd backend && poetry run python seeds/seed_translations.py
"""

import asyncio
import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from sqlalchemy import select
from backend.database.db_helper import db_helper
from backend.api_v1.msg_key.msg_key_model import MsgKey
from backend.api_v1.msg_pg.msg_model import Msg

# (name, eng_value, ukr_value)
TRANSLATIONS: list[tuple[str, str, str]] = [
    # ── flipCompetence dialog ──────────────────────────────────────────
    ("flipCompetenceTitle",
     "Competence List Change",
     "Зміна списку компетенцій"),
    ("flipCompetenceFromStrong",
     "Competence «{competence}» will be removed from <strong>Strengths</strong>. Its facts will be cleared.",
     "Компетенцію «{competence}» буде вилучено з <strong>Сильних сторін</strong>. Факти буде очищено."),
    ("flipCompetenceFromDevelop",
     "Competence «{competence}» will be removed from <strong>Areas to Develop</strong>. Its improvement points will be cleared.",
     "Компетенцію «{competence}» буде вилучено з <strong>Зон розвитку</strong>. Точки покращення буде очищено."),
    ("flipCompetenceMissionWarning",
     "The development-plan mission linked to «{competence}» will be unlinked.",
     "Місію плану розвитку, пов'язану з «{competence}», буде відв'язано."),
    ("flipCompetenceConfirm",
     "Confirm Change",
     "Підтвердити зміну"),

    # ── Sex ───────────────────────────────────────────────────────────
    ("sex",
     "Sex",
     "Стать"),
    ("sexMale",
     "Male",
     "Чоловік"),
    ("sexFemale",
     "Female",
     "Жінка"),
    ("sexMaleShort",
     "male",
     "чол"),
    ("sexFemaleShort",
     "female",
     "жін"),

    # ── Marital status ─────────────────────────────────────────────────
    ("editMaritalStatus",
     "Edit Marital Status",
     "Редагувати сімейний стан"),
    ("maritalStatus",
     "Marital Status",
     "Сімейний стан"),
    ("maritalMarriedMale",
     "married",
     "одружений"),
    ("maritalMarriedFemale",
     "married",
     "заміжня"),
    ("maritalNotMarriedMale",
     "not married",
     "неодружений"),
    ("maritalNotMarriedFemale",
     "not married",
     "незаміжня"),

    # ── Education ──────────────────────────────────────────────────────
    ("degree",
     "Degree",
     "Ступінь"),
    ("degreeBachelor",
     "Bachelor",
     "Бакалавр"),
    ("degreeMaster",
     "Master",
     "Магістр"),
    ("degreeSpecialist",
     "Specialist",
     "Спеціаліст"),
    ("degreeJuniorSpecialist",
     "Junior Specialist",
     "Молодший спеціаліст"),
    ("speciality",
     "Speciality",
     "Спеціальність"),
    ("graduationYear",
     "Graduation Year",
     "Рік випуску"),
    ("education",
     "Education",
     "Освіта"),
    ("addEducation",
     "Add Education",
     "Додати освіту"),
    ("noEducation",
     "No education records",
     "Немає даних про освіту"),
    ("employeeEducationDeleteSuccess",
     "Education record «{name}» deleted",
     "Запис про освіту «{name}» видалено"),

    # ── Children ───────────────────────────────────────────────────────
    ("childrenUnder14",
     "Children (under 14)",
     "Діти (до 14 років)"),
    ("addChild",
     "Add Child",
     "Додати дитину"),
    ("childBirthDate",
     "Child Birth Date",
     "Дата народження дитини"),
    ("employeeChildDeleteSuccess",
     "Child record deleted",
     "Запис про дитину видалено"),

    # ── Foreign languages ──────────────────────────────────────────────
    ("english",
     "English",
     "Англійська"),
    ("french",
     "French",
     "Французька"),
    ("foreignLanguages",
     "Foreign Languages",
     "Іноземні мови"),
    ("foreignLanguagesHint",
     "Select the CEFR proficiency level for each language",
     "Оберіть рівень володіння (CEFR) для кожної мови"),

    # ── CEFR level labels (langLevelLabel + code) ──────────────────────
    ("langLevelLabelA1",
     "Beginner",
     "Початківець"),
    ("langLevelLabelA2",
     "Elementary",
     "Елементарний"),
    ("langLevelLabelB1",
     "Intermediate",
     "Середній"),
    ("langLevelLabelB2",
     "Upper-Intermediate",
     "Вище середнього"),
    ("langLevelLabelC1",
     "Advanced",
     "Просунутий"),
    ("langLevelLabelC2",
     "Proficiency",
     "Досконалий"),

    # ── CEFR level hints (langLevelHint + code) ────────────────────────
    ("langLevelHintA1",
     "Can understand and use familiar everyday expressions and very basic phrases.",
     "Розуміє та використовує знайомі повсякденні вирази та базові фрази."),
    ("langLevelHintA2",
     "Can communicate in simple and routine tasks on familiar topics.",
     "Може спілкуватися в простих і звичних ситуаціях на знайомі теми."),
    ("langLevelHintB1",
     "Can deal with most situations while travelling and produce simple connected text.",
     "Може впоратися з більшістю ситуацій під час подорожей; створює прості зв'язні тексти."),
    ("langLevelHintB2",
     "Can interact with fluency and spontaneity; produce clear, detailed text.",
     "Може взаємодіяти з достатньою швидкістю та спонтанністю; створює чіткі детальні тексти."),
    ("langLevelHintC1",
     "Can use language flexibly and effectively for social, academic and professional purposes.",
     "Може гнучко й ефективно використовувати мову для соціальних, академічних та професійних цілей."),
    ("langLevelHintC2",
     "Can understand with ease virtually everything heard or read; expresses spontaneously and precisely.",
     "Може легко розуміти практично все почуте або прочитане; висловлюється спонтанно й точно."),

    # ── TEMPO competence names (competence + PascalKey) ────────────────
    ("competenceTransformation",
     "Transformation & Results",
     "Трансформація та результативність"),
    ("competenceEthics",
     "Ethics & Exemplarity",
     "Етика та зразковість"),
    ("competenceMobilization",
     "Mobilization & Capabilities",
     "Мобілізація та можливості"),
    ("competencePeoplePlanet",
     "People & Planet",
     "Люди та планета"),
    ("competenceOpenness",
     "Openness & Innovation",
     "Відкритість та інновації"),

    # ── TEMPO competence hints ─────────────────────────────────────────
    ("competenceHintTransformation",
     "Drives change and delivers measurable outcomes.",
     "Впроваджує зміни та досягає вимірюваних результатів."),
    ("competenceHintEthics",
     "Acts with integrity and sets an example for others.",
     "Діє доброчесно та слугує прикладом для інших."),
    ("competenceHintMobilization",
     "Engages people and resources to achieve ambitious goals.",
     "Залучає людей та ресурси для досягнення амбітних цілей."),
    ("competenceHintPeoplePlanet",
     "Cares for people's well-being and environmental sustainability.",
     "Дбає про добробут людей та екологічну сталість."),
    ("competenceHintOpenness",
     "Embraces new ideas and fosters a culture of innovation.",
     "Сприймає нові ідеї та плекає культуру інновацій."),

    # ── Вік ───────────────────────────────────────────────────────────
    ("yearsOld",
     "{age} y.o.",
     "{age} р."),
    ("birthDate",
     "Birth Date",
     "Дата народження"),
    ("editBirthDate",
     "Edit Birth Date",
     "Редагувати дату народження"),
    ("edit",
     "Edit",
     "Редагувати"),
    ("save",
     "Save",
     "Зберегти"),
    ("cancel",
     "Cancel",
     "Скасувати"),
    ("deleteSuccess",
     "Successfully deleted.",
     "Успішно видалено."),
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
        for name, eng_val, ukr_val in TRANSLATIONS:
            key_id = existing_keys.get(name)
            if key_id is None:
                continue  # shouldn't happen

            # English (lang_id=2)
            if (key_id, 2) not in existing_pairs:
                session.add(Msg(msg_key_id=key_id, lang_id=2, value=eng_val))
                new_msgs += 1

            # Ukrainian (lang_id=3)
            if (key_id, 3) not in existing_pairs:
                session.add(Msg(msg_key_id=key_id, lang_id=3, value=ukr_val))
                new_msgs += 1

        await session.commit()

        print(f"[OK] {new_keys} msg_keys inserted, {new_msgs} msgs inserted.")
        if new_keys == 0 and new_msgs == 0:
            print("   All translations already present — nothing to do.")


if __name__ == "__main__":
    asyncio.run(seed_translations())
