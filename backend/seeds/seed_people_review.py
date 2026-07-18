"""
Seeder: populate people-review evaluations, criterion scores, competence
summary, proposed level, and feedback fields for every employee in the last
review session (except UKR7101004).

For each employee it:
  1. Evaluations: score + mean_score + facts + improvement per dimension
  2. Criterion scores: per-descriptor star ratings (what the frontend renders!)
  3. Competence summary: strong/develop JSON on the RSE row
  4. Proposed level: pick a random level, create answers with facts per requirement
  5. Employee & manager feedback, results, trainings, development plan

Run:
    cd backend && poetry run python seeds/seed_people_review.py
"""

import asyncio
import json
import random
import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload

from backend.database.db_helper import db_helper
from backend.api_v1.review_session.review_session_model import ReviewSession
from backend.api_v1.review_session_employee.review_session_employee_model import (
    ReviewSessionEmployee,
)
from backend.api_v1.review_session_employee_evaluation.review_session_employee_evaluation_model import (
    ReviewSessionEmployeeEvaluation,
)
from backend.api_v1.review_dimension.review_dimension_model import ReviewDimension
from backend.api_v1.employee.employee_model import Employee
from backend.api_v1.job.job_model import Job

# ── Criterion scores (star ratings per descriptor) ──────────────────────────
from backend.api_v1.review_session_criterion.review_session_criterion_model import (
    ReviewSessionCriterion,
)
from backend.api_v1.review_session_employee_criterion_score.review_session_employee_criterion_score_model import (
    ReviewSessionEmployeeCriterionScore,
)

# ── Proposed level & answers ────────────────────────────────────────────────
from backend.api_v1.review_level.review_level_model import ReviewLevel
from backend.api_v1.review_level_requirement.review_level_requirement_model import (
    ReviewLevelRequirement,
)
from backend.api_v1.review_session_employee_level.review_session_employee_level_model import (
    ReviewSessionEmployeeLevel,
)
from backend.api_v1.review_session_employee_level_answer.review_session_employee_level_answer_model import (
    ReviewSessionEmployeeLevelAnswer,
)

# ═══════════════════════════════════════════════════════════════════════════════
# Ukrainian text banks
# ═══════════════════════════════════════════════════════════════════════════════

_FACT_BANK: dict[str, list[str]] = {
    "_default": [
        "Виконав(ла) ключові завдання у встановлені терміни.",
        "Продемонстрував(ла) стабільний рівень виконання обов'язків.",
        "Брав(ла) участь у командних проєктах та ініціативах.",
        "Дотримується внутрішніх стандартів та регламентів.",
        "Отримав(ла) позитивний зворотний зв'язок від колег.",
    ],
    "professional_knowledge": [
        "Впевнено володіє профільними технологіями та інструментами.",
        "Регулярно оновлює знання відповідно до вимог посади.",
        "Глибоко розуміє архітектуру систем, з якими працює.",
        "Ділиться експертизою з колегами під час код-рев'ю.",
        "Знаходить нестандартні технічні рішення складних задач.",
        "Самостійно освоїв(ла) новий фреймворк за короткий термін.",
        "Виступав(ла) внутрішнім експертом під час впровадження змін.",
    ],
    "work_quality": [
        "Здає завдання з мінімальною кількістю дефектів.",
        "Дотримується стандартів кодування та документування.",
        "Проводить ретельне тестування перед передачею результатів.",
        "Робота стабільно відповідає критеріям приймання.",
        "Виявляє та виправляє помилки на ранніх етапах.",
        "Впровадив(ла) практики, що зменшили кількість регресій.",
        "Отримує схвальні відгуки від внутрішніх замовників.",
    ],
    "communication": [
        "Чітко формулює технічні вимоги в письмовій формі.",
        "Ефективно презентує результати роботи команді.",
        "Швидко реагує на повідомлення в робочих каналах.",
        "Конструктивно обговорює суперечливі питання.",
        "Веде зрозумілу документацію для суміжних підрозділів.",
        "Провів(ла) кілька успішних демонстрацій для стейкхолдерів.",
        "Налагодив(ла) комунікацію між командами під час інтеграції.",
    ],
    "initiative": [
        "Запропонував(ла) покращення процесу, яке скоротило час виконання.",
        "Самостійно ініціював(ла) рефакторинг застарілого модуля.",
        "Береться за складні задачі без додаткового спонукання.",
        "Активно пропонує нові ідеї на плануваннях.",
        "Виявив(ла) та усунув(ла) вузьке місце у робочому процесі.",
        "За власною ініціативою провів(ла) навчальну сесію.",
        "Створив(ла) прототип, який згодом став продуктовою фічею.",
    ],
    "teamwork": [
        "Ефективно співпрацює з колегами з різних підрозділів.",
        "Підтримує новачків під час онбордингу.",
        "Бере участь у спільних код-рев'ю та парному програмуванні.",
        "Допомагає команді досягати спринтових цілей.",
        "Конструктивно сприймає зворотний зв'язок від колег.",
        "Організував(ла) командний воркшоп для вирішення проблеми.",
        "Створив(ла) атмосферу довіри та взаємодопомоги в команді.",
    ],
    "leadership": [
        "Координував(ла) роботу команди під час критичного релізу.",
        "Приймає обґрунтовані рішення в умовах невизначеності.",
        "Мотивує колег особистим прикладом.",
        "Ефективно делегує завдання з урахуванням сильних сторін.",
        "Бере відповідальність за результати команди.",
    ],
    "result_orientation": [
        "Стабільно досягає ключових показників ефективності.",
        "Фокусується на пріоритетних задачах навіть за високого навантаження.",
        "Доводить розпочаті проєкти до логічного завершення.",
        "Швидко адаптується до зміни вимог без втрати продуктивності.",
        "Продемонстрував(ла) здатність виконувати план попри обмеження.",
    ],
    "customer_focus": [
        "Враховує потреби користувачів під час проєктування рішень.",
        "Оперативно реагує на звернення внутрішніх замовників.",
        "Провів(ла) інтерв'ю з користувачами для валідації гіпотез.",
        "Запропонував(ла) зміни, що покращили користувацький досвід.",
        "Отримує позитивний фідбек від клієнтів.",
    ],
    "analytical_skills": [
        "Системно аналізує проблеми перед початком розробки.",
        "Використовує дані для обґрунтування технічних рішень.",
        "Виявив(ла) приховану закономірність, що дозволило уникнути втрат.",
        "Будує зрозумілі моделі складних бізнес-процесів.",
        "Провів(ла) ґрунтовний аналіз першопричини інциденту.",
    ],
    "stress_resistance": [
        "Зберігає продуктивність під час авралів та дедлайнів.",
        "Конструктивно реагує на критику та невдачі.",
        "Підтримував(ла) команду під час стресового періоду.",
        "Швидко відновлюється після невдалих релізів.",
        "Демонструє емоційну стабільність у конфліктних ситуаціях.",
    ],
    "learning": [
        "Активно вивчає нові технології та інструменти.",
        "Відвідує професійні конференції та воркшопи.",
        "Ділиться знаннями через внутрішні презентації.",
        "Отримав(ла) нову сертифікацію за звітний період.",
        "Застосовує вивчене на практиці в поточних проєктах.",
    ],
}

_IMPROVEMENT_BANK: dict[str, list[str]] = {
    "_default": [
        "Продовжувати розвивати навички у суміжних галузях.",
        "Приділяти більше уваги плануванню робочого часу.",
        "Активніше ділитися досвідом із колегами.",
        "Працювати над підвищенням швидкості виконання завдань.",
    ],
    "professional_knowledge": [
        "Поглибити знання хмарних технологій (AWS/Azure).",
        "Освоїти суміжний стек для розширення профілю.",
        "Більше уваги приділяти вивченню архітектурних патернів.",
        "Покращити розуміння CI/CD пайплайнів та DevOps практик.",
    ],
    "work_quality": [
        "Зменшити кількість дрібних помилок за рахунок ретельнішого тестування.",
        "Впровадити практику самоперевірки перед здачею завдань.",
        "Приділяти більше уваги крайовим випадкам.",
        "Покращити якість документації до коду.",
    ],
    "communication": [
        "Розвивати навички публічних виступів та презентацій.",
        "Більш структуровано оформлювати письмові комунікації.",
        "Покращити навички ведення складних переговорів.",
        "Активніше брати участь у міжкомандних обговореннях.",
    ],
    "initiative": [
        "Частіше пропонувати ідеї для покращення процесів.",
        "Брати на себе відповідальність за нові ініціативи.",
        "Розвивати підприємницьке мислення.",
        "Активніше експериментувати з новими підходами.",
    ],
    "teamwork": [
        "Більше залучатися до крос-функціональних проєктів.",
        "Покращити навички наставництва молодших колег.",
        "Активніше брати участь у командних ретроспективах.",
        "Розвивати емпатію та навички активного слухання.",
    ],
    "leadership": [
        "Розвивати стратегічне мислення та бачення.",
        "Покращити навички управління конфліктами.",
        "Більше уваги приділяти розвитку членів команди.",
        "Працювати над навичками впливу та переконання.",
    ],
    "result_orientation": [
        "Покращити навички пріоритезації задач.",
        "Працювати над швидкістю прийняття рішень.",
        "Більш системно підходити до відстеження прогресу.",
        "Розвивати навички управління очікуваннями стейкхолдерів.",
    ],
    "customer_focus": [
        "Глибше вивчати потреби кінцевих користувачів.",
        "Покращити навички збору та аналізу зворотного зв'язку.",
        "Більше уваги приділяти UX-дослідженням.",
        "Розвивати продуктове мислення.",
    ],
    "analytical_skills": [
        "Покращити навички роботи з великими обсягами даних.",
        "Освоїти нові інструменти для аналітики.",
        "Розвивати системне мислення.",
        "Більше уваги приділяти кількісному обґрунтуванню рішень.",
    ],
    "stress_resistance": [
        "Освоїти техніки управління стресом та вигоранням.",
        "Покращити навички тайм-менеджменту.",
        "Працювати над емоційною саморегуляцією.",
        "Розвивати навички відновлення після інтенсивних періодів.",
    ],
    "learning": [
        "Скласти індивідуальний план професійного розвитку.",
        "Більше часу приділяти вивченню суміжних технологій.",
        "Активніше брати участь у професійних спільнотах.",
        "Отримати профільну сертифікацію.",
    ],
}

# ── Feedback & free-text banks ──────────────────────────────────────────────

_EMPLOYEE_FEEDBACK_BANK: list[str] = [
    "Вважаю, що звітний період був продуктивним. Вдалося реалізувати ключові проєкти та покращити взаємодію з командою. Планую продовжувати розвиватися в обраному напрямку.",
    "Задоволений(на) результатами роботи за період. Основні цілі досягнуто, хоча були складнощі з пріоритезацією задач. Дякую керівнику за підтримку.",
    "Період був насиченим і цікавим. Вдалося освоїти нові інструменти та підходи. Відчуваю потребу в більш структурованому плані розвитку на наступний період.",
    "Робота приносить задоволення. Колектив підтримує, завдання різноманітні. Хотілося б більше можливостей для професійного зростання.",
    "Звітний період показав мої сильні сторони в управлінні проєктами. Є над чим працювати в комунікації з суміжними підрозділами.",
    "Вважаю період успішним — виконав(ла) план, брав(ла) участь у кількох ініціативах. Особистий фокус на наступний період — розвиток лідерських якостей.",
]

_MANAGER_FEEDBACK_BANK: list[str] = [
    "Співробітник демонструє стабільний професійний ріст. Відповідально ставиться до завдань, проявляє ініціативу. Рекомендую звернути увагу на розвиток стратегічного мислення.",
    "Надійний член команди. Якість роботи на високому рівні. Для подальшого розвитку рекомендується активніше брати участь у крос-функціональних проєктах.",
    "Позитивна динаміка у виконанні поставлених цілей. Співробітник орієнтований на результат, вміє працювати в команді. Потребує розвитку навичок презентації.",
    "Сильний професіонал із глибокими знаннями у своїй галузі. Рекомендую більше уваги приділяти наставництву молодших колег та обміну досвідом.",
    "Співробітник показує хороші результати, адаптивний до змін. Побажання — бути більш проактивним у пропозиціях щодо покращення процесів.",
    "Відповідальний та дисциплінований працівник. Виконує завдання вчасно, користується повагою колег. Рекомендую працювати над швидкістю прийняття рішень.",
]

_RESULTS_BANK: list[str] = [
    "1. Виконано план продажів на 105% за звітний період.\n2. Впроваджено нову систему звітності для відділу.\n3. Проведено навчання для 5 нових співробітників.\n4. Оптимізовано процес обробки заявок — час скорочено на 20%.",
    "1. Завершено проєкт з міграції даних у встановлені терміни.\n2. Розроблено та впроваджено 3 нові функціональні модулі.\n3. Підготовлено технічну документацію для суміжних команд.\n4. Успішно пройдено зовнішній аудит без зауважень.",
    "1. Досягнуто цільових показників якості обслуговування клієнтів.\n2. Зменшено кількість скарг на 30% порівняно з попереднім періодом.\n3. Впроваджено стандарти обслуговування у 2 нових відділеннях.\n4. Організовано зворотний зв'язок від клієнтів — NPS зріс на 8 пунктів.",
    "1. Виконано план виробництва відповідно до графіку.\n2. Впроваджено заходи з охорони праці — нуль нещасних випадків.\n3. Проведено інвентаризацію основних засобів.\n4. Підготовлено пропозиції щодо модернізації обладнання.",
    "1. Забезпечено безперебійну роботу IT-інфраструктури (uptime 99.8%).\n2. Оновлено парк серверного обладнання.\n3. Впроваджено систему моніторингу та алертингу.\n4. Проведено навчання користувачів новим інструментам.",
    "1. Підготовлено та погоджено річний бюджет відділу.\n2. Оптимізовано витрати — економія 12% від запланованого.\n3. Впроваджено електронний документообіг.\n4. Проведено тендери та укладено 7 нових контрактів із постачальниками.",
]

_TRAININGS_BANK: list[str] = [
    "1. Курс «Управління проєктами» (PMI, 2026).\n2. Тренінг з ефективної комунікації (внутрішній, березень 2026).",
    "1. Сертифікація ISO 9001:2026 (зовнішній аудитор).\n2. Онлайн-курс «Data Analysis with Python» (Coursera).",
    "1. Семінар «Охорона праці та промислова безпека» (квітень 2026).\n2. Курс підвищення кваліфікації за фахом (НТУУ «КПІ», 2026).",
    "1. Тренінг «Лідерство та управління командою» (зовнішній провайдер).\n2. Воркшоп з Agile/Scrum методологій (внутрішній).",
    "1. Онлайн-курс «Cloud Architecture» (AWS Training).\n2. Конференція «IT Weekend Ukraine 2026» (учасник).",
    "1. Навчання з фінансової звітності за МСФЗ.\n2. Курс англійської мови (Intermediate, триває).",
]

# ── Level-requirement facts bank ────────────────────────────────────────────

_LEVEL_FACTS: list[str] = [
    "Маю практичний досвід виконання подібних завдань протягом останніх 2 років.",
    "Пройшов(ла) відповідне навчання та успішно застосовую знання на практиці.",
    "Брав(ла) участь у проєктах, де ця компетенція була ключовою.",
    "Отримав(ла) позитивний зворотний зв'язок від керівника щодо цього напрямку.",
    "Регулярно демонструю цю навичку в повсякденній роботі.",
    "Маю сертифікацію, що підтверджує цей рівень компетенції.",
    "Виконував(ла) роль наставника для колег у цій сфері.",
    "Успішно застосував(ла) цю компетенцію під час кризової ситуації.",
    "Підтверджую готовність до виконання завдань цього рівня складності.",
    "Маю досвід самостійного вирішення задач у цій галузі.",
]

# ═══════════════════════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════════════════════

_TEXT_THEME_KEYS = [
    "professional_knowledge", "work_quality", "communication",
    "initiative", "teamwork", "leadership", "result_orientation",
    "customer_focus", "analytical_skills", "stress_resistance", "learning",
]


def _theme_for_dimension(dim: ReviewDimension) -> str:
    dk = (dim.key or "").lower()
    dn = (dim.name or "").lower()
    combined = f"{dk} {dn}"
    for theme in _TEXT_THEME_KEYS:
        if theme in combined:
            return theme
    return "_default"


def _pick(items: list, count: int = 3) -> list:
    if len(items) <= count:
        return list(items)
    return random.sample(items, count)


def _build_facts(dim: ReviewDimension, job: Job | None) -> str:
    theme = _theme_for_dimension(dim)
    pool = _FACT_BANK.get(theme, _FACT_BANK["_default"])
    chosen = _pick(pool, random.randint(2, 4))
    if job and random.random() < 0.3:
        chosen.append(f"У ролі «{job.name}» продемонстрував(ла) високий рівень компетенції.")
    return "\n".join(f"{i}. {line}" for i, line in enumerate(chosen, 1))


def _build_improvement(dim: ReviewDimension) -> str:
    theme = _theme_for_dimension(dim)
    pool = _IMPROVEMENT_BANK.get(theme, _IMPROVEMENT_BANK["_default"])
    chosen = _pick(pool, random.randint(1, 3))
    return "\n".join(f"{i}. {line}" for i, line in enumerate(chosen, 1))


def _build_competence_summary(
    evaluations: list[ReviewSessionEmployeeEvaluation],
    dimensions_by_id: dict[int, ReviewDimension],
) -> str | None:
    if not evaluations:
        return None

    def _score(e: ReviewSessionEmployeeEvaluation) -> float:
        return e.mean_score if e.mean_score is not None else float(e.score or 0)

    sorted_evals = sorted(evaluations, key=_score, reverse=True)
    strong_ids = sorted_evals[:2]
    develop_ids = sorted_evals[-2:] if len(sorted_evals) >= 4 else sorted_evals[2:]

    def _item(e: ReviewSessionEmployeeEvaluation) -> dict | None:
        dim = dimensions_by_id.get(e.dimension_id)
        if dim is None:
            return None
        facts_text = e.facts or ""
        comments = [line.strip() for line in facts_text.split("\n") if line.strip()]
        comments = [c.split(". ", 1)[1] if ". " in c[:4] else c for c in comments]
        if not comments:
            comments = [dim.name]
        return {"dimension_key": dim.key, "comments": comments}

    strong_items = [item for e in strong_ids if (item := _item(e))]
    develop_items = [item for e in develop_ids if (item := _item(e))]
    if not strong_items and not develop_items:
        return None
    return json.dumps({"strong": strong_items, "develop": develop_items}, ensure_ascii=False)


def _build_development_plan(dimensions: list[ReviewDimension]) -> str:
    chosen = _pick(dimensions, min(3, len(dimensions)))
    missions = [
        {
            "text": f"Розвивати компетенцію «{d.name}» через участь у проєктах та навчання.",
            "dimension_key": d.key,
        }
        for d in chosen
    ]
    return json.dumps(missions, ensure_ascii=False)


# ═══════════════════════════════════════════════════════════════════════════════
# Section: Criterion Scores (star ratings per descriptor)
# ═══════════════════════════════════════════════════════════════════════════════


async def _seed_criterion_scores(
    session,
    evaluation: ReviewSessionEmployeeEvaluation,
    criteria_by_dim: dict[int, list[ReviewSessionCriterion]],
):
    """Create per-descriptor star ratings so the frontend renders stars.

    The frontend draws stars from criterion_scores, not from the evaluation's
    score/mean_score fields. Without these records the stars are invisible even
    though the data is correct in PDF/HTML output.
    """
    # Check if scores already exist for this evaluation
    result = await session.execute(
        select(ReviewSessionEmployeeCriterionScore).where(
            ReviewSessionEmployeeCriterionScore.review_session_employee_evaluation_id == evaluation.id
        )
    )
    existing = list(result.scalars().all())
    if existing:
        return  # already seeded

    criteria = criteria_by_dim.get(evaluation.dimension_id, [])
    if not criteria:
        return

    base = evaluation.score or 3
    for idx, criterion in enumerate(criteria):
        # Vary around the base score ±1, clamped to 1..MAX_GRADE (4)
        star = max(1, min(4, base + random.randint(-1, 1)))
        cs = ReviewSessionEmployeeCriterionScore(
            review_session_employee_evaluation_id=evaluation.id,
            criterion_index=idx,
            score=star,
        )
        session.add(cs)


# ═══════════════════════════════════════════════════════════════════════════════
# Section: Proposed Level
# ═══════════════════════════════════════════════════════════════════════════════


async def _seed_proposed_level(
    session,
    rse: ReviewSessionEmployee,
    levels: list[ReviewLevel],
    level_requirements: dict[int, list[ReviewLevelRequirement]],
):
    result = await session.execute(
        select(ReviewSessionEmployeeLevel).where(
            ReviewSessionEmployeeLevel.review_session_employee_id == rse.id
        )
    )
    existing = result.scalar_one_or_none()
    if existing is not None:
        print(f"   [SKIP] proposed_level — already exists (level_id={existing.level_id}), skipping.")
        return

    level = random.choice(levels)
    reqs = level_requirements.get(level.id, [])
    if not reqs:
        print(f"   [WARN] level «{level.name_key}» has no requirements, skipping proposed level.")
        return

    proposed = ReviewSessionEmployeeLevel(
        review_session_employee_id=rse.id,
        level_id=level.id,
        status="proposed",
    )
    session.add(proposed)
    await session.flush()

    for req in reqs:
        facts = "\n".join(
            f"{i}. {line}"
            for i, line in enumerate(_pick(_LEVEL_FACTS, random.randint(1, 3)), 1)
        )
        answer = ReviewSessionEmployeeLevelAnswer(
            review_session_employee_level_id=proposed.id,
            requirement_id=req.id,
            facts=facts,
        )
        session.add(answer)

    print(f"   proposed_level: {level.name_key} ({len(reqs)} answers)")


# ═══════════════════════════════════════════════════════════════════════════════
# Section: Feedback, Trainings, Results, Development Plan
# ═══════════════════════════════════════════════════════════════════════════════


async def _seed_feedback_fields(
    session,
    rse: ReviewSessionEmployee,
    dimensions: list[ReviewDimension],
):
    if not rse.employee_feedback:
        rse.employee_feedback = random.choice(_EMPLOYEE_FEEDBACK_BANK)
        print(f"   employee_feedback — filled.")

    if not rse.manager_feedback:
        rse.manager_feedback = random.choice(_MANAGER_FEEDBACK_BANK)
        print(f"   manager_feedback — filled.")

    if not rse.results_achievements:
        rse.results_achievements = random.choice(_RESULTS_BANK)
        print(f"   results_achievements — filled.")

    if not rse.trainings:
        rse.trainings = random.choice(_TRAININGS_BANK)
        print(f"   trainings — filled.")

    if not rse.development_plan:
        rse.development_plan = _build_development_plan(dimensions)
        print(f"   development_plan — filled.")


# ═══════════════════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════════════════


async def seed_people_review():
    async with db_helper.session_factory() as session:
        # ── 1. Last review session ──────────────────────────────────────────
        result = await session.execute(
            select(ReviewSession).order_by(desc(ReviewSession.id)).limit(1)
        )
        session_obj = result.scalar_one_or_none()
        if not session_obj:
            print("[ERR] No review session found — seed aborted.")
            return
        print(f"Session: {session_obj.name} (id={session_obj.id})")

        # ── 2. Excluded employee ────────────────────────────────────────────
        result = await session.execute(
            select(Employee).where(Employee.code == "UKR7101004")
        )
        excluded_emp = result.scalar_one_or_none()
        excluded_id = excluded_emp.id if excluded_emp else None
        if excluded_emp:
            print(f"[SKIP] Excluding: {excluded_emp.name} ({excluded_emp.code})")

        # ── 3. RSE list ─────────────────────────────────────────────────────
        result = await session.execute(
            select(ReviewSessionEmployee)
            .where(ReviewSessionEmployee.session_id == session_obj.id)
            .options(
                selectinload(ReviewSessionEmployee.employee).selectinload(Employee.job),
                selectinload(ReviewSessionEmployee.evaluations),
            )
        )
        rse_list: list[ReviewSessionEmployee] = list(result.scalars().all())
        print(f"Found {len(rse_list)} employees in session.")

        if excluded_id is not None:
            rse_list = [r for r in rse_list if r.employee_id != excluded_id]
            print(f"After exclusion: {len(rse_list)} employees to seed.")
        if not rse_list:
            print("[WARN] No employees to seed.")
            return

        # ── 4. Dimensions ───────────────────────────────────────────────────
        result = await session.execute(
            select(ReviewDimension)
            .where(ReviewDimension.is_active == True)
            .order_by(ReviewDimension.sort_order)
        )
        dimensions: list[ReviewDimension] = list(result.scalars().all())
        if not dimensions:
            print("[ERR] No active review dimensions found.")
            return
        print(f"{len(dimensions)} active dimensions loaded.")
        dimensions_by_id = {d.id: d for d in dimensions}

        # ── 5. Frozen criteria for this session (per dimension) ─────────────
        result = await session.execute(
            select(ReviewSessionCriterion)
            .where(ReviewSessionCriterion.session_id == session_obj.id)
            .order_by(ReviewSessionCriterion.sort_order)
        )
        criteria_by_dim: dict[int, list[ReviewSessionCriterion]] = {}
        for c in result.scalars().all():
            criteria_by_dim.setdefault(c.dimension_id, []).append(c)
        print(f"{sum(len(v) for v in criteria_by_dim.values())} frozen criteria loaded "
              f"across {len(criteria_by_dim)} dimensions.")

        # ── 6. Levels (for proposed level) ──────────────────────────────────
        result = await session.execute(
            select(ReviewLevel)
            .where(ReviewLevel.is_active == True)
            .order_by(ReviewLevel.sort_order)
        )
        levels: list[ReviewLevel] = list(result.scalars().all())
        level_requirements: dict[int, list[ReviewLevelRequirement]] = {}
        if levels:
            result = await session.execute(
                select(ReviewLevelRequirement)
                .where(ReviewLevelRequirement.level_id.in_([lv.id for lv in levels]))
                .where(ReviewLevelRequirement.is_active == True)
                .order_by(ReviewLevelRequirement.sort_order)
            )
            for req in result.scalars().all():
                level_requirements.setdefault(req.level_id, []).append(req)
            print(f"{len(levels)} review levels loaded.")
        else:
            print("[WARN] No active review levels — proposed level will be skipped.")

        # ── 7. Per-employee loop ────────────────────────────────────────────
        filled_evals = 0
        updated_evals = 0
        updated_rses = 0
        criterion_total = 0

        for rse in rse_list:
            emp = rse.employee
            job = emp.job if emp else None
            emp_label = f"{emp.name} ({emp.code})" if emp else f"RSE#{rse.id}"
            job_label = f"«{job.name}»" if job else "без посади"
            print(f"\n{'─'*60}")
            print(f"{emp_label} — {job_label}")
            print(f"{'─'*60}")

            # ── 7a. Evaluations + criterion scores ──────────────────────
            existing_evals: list[ReviewSessionEmployeeEvaluation] = (
                rse.evaluations if rse.evaluations else []
            )
            existing_by_dim = {e.dimension_id: e for e in existing_evals}
            touched_evals: list[ReviewSessionEmployeeEvaluation] = []

            for dim in dimensions:
                existing = existing_by_dim.get(dim.id)
                if existing is not None and existing.score is not None:
                    touched_evals.append(existing)
                    # Still seed criterion scores if missing
                    await _seed_criterion_scores(session, existing, criteria_by_dim)
                    continue

                score = random.randint(1, 4)  # MAX_GRADE=4
                # NOTE: this writes mean_score = the WHOLE score, so the cached
                # mean_score here is intentionally NOT the true criterion mean.
                # Display (graph/album) must derive the value from criterion_scores,
                # never this column. See the mean_score field comment on the model.
                mean_score = float(score)
                facts = _build_facts(dim, job)
                improvement = _build_improvement(dim)

                if existing is not None:
                    existing.score = score
                    existing.mean_score = mean_score
                    existing.facts = facts
                    existing.improvement = improvement
                    touched_evals.append(existing)
                    updated_evals += 1
                    eval_obj = existing
                else:
                    evaluation = ReviewSessionEmployeeEvaluation(
                        review_session_employee_id=rse.id,
                        dimension_id=dim.id,
                        score=score,
                        mean_score=mean_score,
                        facts=facts,
                        improvement=improvement,
                    )
                    session.add(evaluation)
                    touched_evals.append(evaluation)
                    filled_evals += 1
                    eval_obj = evaluation

                await session.flush()
                await _seed_criterion_scores(session, eval_obj, criteria_by_dim)

            await session.flush()

            # ── 7b. Competence summary ──────────────────────────────────
            if touched_evals:
                summary = _build_competence_summary(touched_evals, dimensions_by_id)
                if summary:
                    rse.competence_summary = summary
                    updated_rses += 1
                    s = json.loads(summary)
                    print(f"   competence_summary: {len(s.get('strong',[]))} strong, {len(s.get('develop',[]))} develop")

            # ── 7c. Proposed level ──────────────────────────────────────
            if levels:
                await _seed_proposed_level(session, rse, levels, level_requirements)

            # ── 7d. Feedback, trainings, results, development plan ──────
            await _seed_feedback_fields(session, rse, dimensions)

        await session.commit()

        # Count total criterion scores created
        result = await session.execute(
            select(ReviewSessionEmployeeCriterionScore)
        )
        criterion_total = len(list(result.scalars().all()))

        print(f"\n{'='*60}")
        print(f"[DONE] Done!")
        print(f"   Evaluations: {filled_evals} new + {updated_evals} updated")
        print(f"   RSE summaries: {updated_rses}")
        print(f"   Criterion scores in DB: {criterion_total}")
        print(f"{'='*60}")


if __name__ == "__main__":
    asyncio.run(seed_people_review())
