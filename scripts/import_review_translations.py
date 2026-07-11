"""
One-shot import of all people-review (backend + frontend) translations into the
TALENT database. Run while the backend is up:

    cd backend
    poetry run python ../scripts/import_review_translations.py

With BYPASS_LDAP=true, any creds work. The script uses the same upsert endpoint
as the developer Import JSON dialog — existing keys are updated, new keys inserted,
nothing deleted.
"""
import json
import sys
import httpx

BASE = "http://127.0.0.1:8004/api/v1"

# ── 1. Get a token ────────────────────────────────────────────────────────────
def login() -> str:
    r = httpx.post(
        f"{BASE}/jwt/login",
        data={"username": "admin", "password": "admin"},
        timeout=10,
    )
    r.raise_for_status()
    return r.json()["access_token"]

# ── 2. All translations ───────────────────────────────────────────────────────
TRANSLATIONS = {
    # ═══════════════════════════════════════════════════════════════════════════
    # BACKEND — review essences (_errors.py / _success.py message_key values)
    # ═══════════════════════════════════════════════════════════════════════════

    # ── review_dimension ──
    "reviewDimensionNotFound": {
        "ukr": "Вимір оцінювання з ID ${typeId} не знайдено",
        "eng": "Review dimension with ID ${typeId} not found",
    },
    "reviewDimensionNotFoundByName": {
        "ukr": "Вимір оцінювання з назвою '${name}' не знайдено",
        "eng": "Review dimension with name '${name}' not found",
    },
    "reviewDimensionNameTaken": {
        "ukr": "Вимір оцінювання з назвою '${name}' вже існує",
        "eng": "Review dimension with name '${name}' already exists",
    },
    "reviewDimensionInvalidColor": {
        "ukr": "Недійсний колір '${color}'. Використовуйте hex-значення, наприклад #2E7D32.",
        "eng": "Invalid color '${color}'. Use a hex value like #2E7D32.",
    },
    "reviewDimensionDeleteError": {
        "ukr": "Вимір оцінювання '${name}' неможливо видалити, оскільки він використовується іншими записами",
        "eng": "Review dimension '${name}' cannot be deleted because it is referenced by other records",
    },
    "reviewDimensionDeleteSuccess": {
        "ukr": "Вимір оцінювання '${name}' успішно видалено",
        "eng": "Review dimension '${name}' successfully deleted",
    },
    "reviewDimensionCreateSuccess": {
        "ukr": "Вимір оцінювання '${name}' успішно створено",
        "eng": "Review dimension '${name}' successfully created",
    },
    "reviewDimensionUpdateSuccess": {
        "ukr": "Вимір оцінювання '${name}' успішно оновлено",
        "eng": "Review dimension '${name}' successfully updated",
    },

    # ── review_dimension_criteria ──
    "reviewDimensionCriteriaNotFound": {
        "ukr": "Критерій виміру оцінювання з ID ${typeId} не знайдено",
        "eng": "Review dimension criteria with ID ${typeId} not found",
    },
    "reviewDimensionCriteriaDeleteError": {
        "ukr": "Критерій виміру оцінювання '${name}' неможливо видалити",
        "eng": "Review dimension criteria '${name}' cannot be deleted",
    },
    "reviewDimensionCriteriaDeleteSuccess": {
        "ukr": "Критерій виміру оцінювання '${name}' успішно видалено",
        "eng": "Review dimension criteria '${name}' successfully deleted",
    },
    "reviewDimensionCriteriaCreateSuccess": {
        "ukr": "Критерій виміру оцінювання '${name}' успішно створено",
        "eng": "Review dimension criteria '${name}' successfully created",
    },
    "reviewDimensionCriteriaUpdateSuccess": {
        "ukr": "Критерій виміру оцінювання '${name}' успішно оновлено",
        "eng": "Review dimension criteria '${name}' successfully updated",
    },

    # ── review_level ──
    "reviewLevelNotFound": {
        "ukr": "Рівень оцінювання з ID ${typeId} не знайдено",
        "eng": "Review level with ID ${typeId} not found",
    },
    "reviewLevelDeleteError": {
        "ukr": "Рівень оцінювання '${name}' неможливо видалити, оскільки він використовується іншими записами",
        "eng": "Review level '${name}' cannot be deleted because it is referenced by other records",
    },
    "reviewLevelDeleteSuccess": {
        "ukr": "Рівень оцінювання '${name}' успішно видалено",
        "eng": "Review level '${name}' successfully deleted",
    },
    "reviewLevelCreateSuccess": {
        "ukr": "Рівень оцінювання '${name}' успішно створено",
        "eng": "Review level '${name}' successfully created",
    },
    "reviewLevelUpdateSuccess": {
        "ukr": "Рівень оцінювання '${name}' успішно оновлено",
        "eng": "Review level '${name}' successfully updated",
    },

    # ── review_level_requirement ──
    "reviewLevelRequirementNotFound": {
        "ukr": "Вимогу рівня оцінювання з ID ${typeId} не знайдено",
        "eng": "Review level requirement with ID ${typeId} not found",
    },
    "reviewLevelRequirementDeleteError": {
        "ukr": "Вимогу рівня оцінювання '${name}' неможливо видалити",
        "eng": "Review level requirement '${name}' cannot be deleted",
    },
    "reviewLevelRequirementDeleteSuccess": {
        "ukr": "Вимогу рівня оцінювання '${name}' успішно видалено",
        "eng": "Review level requirement '${name}' successfully deleted",
    },
    "reviewLevelRequirementCreateSuccess": {
        "ukr": "Вимогу рівня оцінювання '${name}' успішно створено",
        "eng": "Review level requirement '${name}' successfully created",
    },
    "reviewLevelRequirementUpdateSuccess": {
        "ukr": "Вимогу рівня оцінювання '${name}' успішно оновлено",
        "eng": "Review level requirement '${name}' successfully updated",
    },

    # ── review_session ──
    "reviewSessionNotFound": {
        "ukr": "Сесію оцінювання з ID ${typeId} не знайдено",
        "eng": "Review session with ID ${typeId} not found",
    },
    "reviewSessionDeleteError": {
        "ukr": "Сесію оцінювання '${name}' неможливо видалити, оскільки вона містить оцінювання працівників",
        "eng": "Review session '${name}' cannot be deleted because it has employee reviews",
    },
    "reviewSessionDeletePermission": {
        "ukr": "Тільки розробники можуть видаляти сесії оцінювання",
        "eng": "Only developers can delete review sessions",
    },
    "reviewSessionStatusError": {
        "ukr": "Неможливо змінити статус з '${current}' на '${target}'",
        "eng": "Cannot change status from '${current}' to '${target}'",
    },
    "reviewSessionCannotClose": {
        "ukr": "Неможливо закрити сесію: ${count} оцінювань працівників ще не закрито",
        "eng": "Cannot close session: ${count} employee review(s) are not yet closed",
    },
    "reviewSessionDeleteSuccess": {
        "ukr": "Сесію оцінювання '${name}' успішно видалено",
        "eng": "Review session '${name}' successfully deleted",
    },
    "reviewSessionCreateSuccess": {
        "ukr": "Сесію оцінювання '${name}' успішно створено",
        "eng": "Review session '${name}' successfully created",
    },
    "reviewSessionUpdateSuccess": {
        "ukr": "Сесію оцінювання '${name}' успішно оновлено",
        "eng": "Review session '${name}' successfully updated",
    },
    "reviewSessionOpenSuccess": {
        "ukr": "Сесію оцінювання '${name}' успішно відкрито",
        "eng": "Review session '${name}' successfully opened",
    },
    "reviewSessionCloseSuccess": {
        "ukr": "Сесію оцінювання '${name}' успішно закрито",
        "eng": "Review session '${name}' successfully closed",
    },
    "reviewSessionRevertSuccess": {
        "ukr": "Сесію оцінювання '${name}' повернуто до стану «відкрито»",
        "eng": "Review session '${name}' reverted to open",
    },

    # ── review_session_employee ──
    "reviewSessionEmployeeNotFound": {
        "ukr": "Працівника в сесії оцінювання з ID ${typeId} не знайдено",
        "eng": "Review session employee with ID ${typeId} not found",
    },
    "reviewSessionEmployeeStatusError": {
        "ukr": "Неможливо змінити статус оцінювання працівника з '${current}' на '${target}'",
        "eng": "Cannot change RSE status from '${current}' to '${target}'",
    },
    "reviewSessionEmployeeAlreadyInSession": {
        "ukr": "'${name}' вже додано до цієї сесії",
        "eng": "'${name}' is already in this session",
    },
    "reviewSessionReorderNotAllowed": {
        "ukr": "Тільки наглядовий рецензент може змінювати порядок черги презентації",
        "eng": "Only an oversight reviewer can reorder the presentation queue",
    },
    "reviewSessionNotOpenForAdd": {
        "ukr": "Неможливо додати працівників до сесії зі статусом '${status}'",
        "eng": "Cannot add employees to a session in '${status}' status",
    },
    "proposedLevelRequiredForReview": {
        "ukr": "Перед завершенням оцінювання необхідно визначити запропонований рівень (підтвердьте поточний або запропонуйте новий)",
        "eng": "A proposed level is required before this review can be marked reviewed (confirm the current level or propose a new one)",
    },
    "proposedLevelDetailsIncomplete": {
        "ukr": "Заповніть деталі для кожної вимоги запропонованого рівня перед завершенням оцінювання",
        "eng": "Fill in the details for every requirement of the proposed level before marking this review reviewed",
    },
    "reviewSessionEmployeeStatusChanged": {
        "ukr": "Оцінювання для '${name}' змінено на '${status}'",
        "eng": "Review for '${name}' changed to '${status}'",
    },
    "reviewSessionEmployeeAdded": {
        "ukr": "'${name}' додано до сесії",
        "eng": "'${name}' added to the session",
    },
    "reviewSessionEmployeeQueueOrdered": {
        "ukr": "Порядок черги презентації збережено",
        "eng": "Presentation queue order saved",
    },

    # ── review_session_employee_comment ──
    "reviewCommentNotFound": {
        "ukr": "Коментар ${typeId} не знайдено",
        "eng": "Comment ${typeId} not found",
    },
    "reviewCommentReviewNotOpen": {
        "ukr": "Нотатки можна змінювати лише поки оцінювання відкрите",
        "eng": "Notes can be changed only while the review is open",
    },
    "reviewCommentRoleRequired": {
        "ukr": "Тільки наглядовий або контролюючий рецензент може додавати нотатки (не для себе)",
        "eng": "Only an oversight or supervision reviewer can add notes (never on yourself)",
    },
    "reviewCommentNotOwner": {
        "ukr": "Ви можете змінювати лише власні нотатки",
        "eng": "You can only change your own notes",
    },
    "reviewCommentInvalid": {
        "ukr": "Некоректна нотатка (порожній текст або невідома видимість)",
        "eng": "Invalid note (empty text or unknown visibility)",
    },
    "reviewCommentCreateSuccess": {
        "ukr": "Нотатку додано",
        "eng": "Note added",
    },
    "reviewCommentUpdateSuccess": {
        "ukr": "Нотатку оновлено",
        "eng": "Note updated",
    },
    "reviewCommentDeleteSuccess": {
        "ukr": "Нотатку видалено",
        "eng": "Note deleted",
    },

    # ── review_session_employee_evaluation ──
    "evaluationNotFound": {
        "ukr": "Оцінку з ID ${typeId} не знайдено",
        "eng": "Evaluation with ID ${typeId} not found",
    },
    "evaluationNotEditable": {
        "ukr": "Оцінку неможливо редагувати — сесія оцінювання не відкрита",
        "eng": "Evaluation cannot be edited - review session is not open",
    },
    "evaluationSaveSuccess": {
        "ukr": "Оцінки успішно збережено",
        "eng": "Evaluations saved successfully",
    },

    # ── review_session_employee_level (proposed level) ──
    "proposedLevelNotFound": {
        "ukr": "Для працівника ${typeId} не зареєстровано запропонованого рівня",
        "eng": "No proposed level registered for review employee ${typeId}",
    },
    "proposedLevelStepTooHigh": {
        "ukr": "Запропонований рівень може бути щонайбільше на один рівень вище поточного.",
        "eng": "The proposed level can be at most one level above the current level.",
    },
    "proposedLevelSaveSuccess": {
        "ukr": "Запропонований рівень успішно збережено",
        "eng": "Proposed level saved successfully",
    },
    "proposedLevelDeleteSuccess": {
        "ukr": "Запропонований рівень успішно видалено",
        "eng": "Proposed level deleted successfully",
    },
    "proposedLevelStatusUpdateSuccess": {
        "ukr": "Статус запропонованого рівня оновлено",
        "eng": "Proposed level status updated",
    },

    # ═══════════════════════════════════════════════════════════════════════════
    # FRONTEND — people-review UI strings
    # ═══════════════════════════════════════════════════════════════════════════

    # ── Shared / generic (check if already exist before importing) ──
    "cancel": {"ukr": "Скасувати", "eng": "Cancel"},
    "save": {"ukr": "Зберегти", "eng": "Save"},
    "delete": {"ukr": "Видалити", "eng": "Delete"},
    "edit": {"ukr": "Редагувати", "eng": "Edit"},
    "create": {"ukr": "Створити", "eng": "Create"},
    "add": {"ukr": "Додати", "eng": "Add"},
    "search": {"ukr": "Пошук", "eng": "Search"},
    "close": {"ukr": "Закрити", "eng": "Close"},
    "actions": {"ukr": "Дії", "eng": "Actions"},
    "status": {"ukr": "Статус", "eng": "Status"},
    "name": {"ukr": "Назва", "eng": "Name"},
    "code": {"ukr": "Код", "eng": "Code"},
    "employee": {"ukr": "Працівник", "eng": "Employee"},
    "employees": {"ukr": "Працівники", "eng": "Employees"},
    "department": {"ukr": "Відділ", "eng": "Department"},
    "description": {"ukr": "Опис", "eng": "Description"},
    "progress": {"ukr": "Прогрес", "eng": "Progress"},
    "mode": {"ukr": "Режим", "eng": "Mode"},
    "viewMode": {"ukr": "Режим перегляду", "eng": "View mode"},
    "deleting": {"ukr": "Видалення...", "eng": "Deleting..."},
    "adding": {"ukr": "Додавання...", "eng": "Adding..."},
    "confirmDelete": {"ukr": "Підтвердіть видалення", "eng": "Confirm delete"},
    "fieldRequired": {"ukr": "Це поле обов'язкове", "eng": "This field is required"},
    "idColumn": {"ukr": "ID", "eng": "ID"},
    "deletingEllipsis": {"ukr": "Видалення...", "eng": "Deleting..."},
    "creatingEllipsis": {"ukr": "Створення...", "eng": "Creating..."},
    "savingEllipsis": {"ukr": "Збереження...", "eng": "Saving..."},

    # ── Status labels ──
    "statusPending": {"ukr": "Очікує", "eng": "Pending"},
    "statusOpen": {"ukr": "Відкрито", "eng": "Open"},
    "statusClosed": {"ukr": "Закрито", "eng": "Closed"},
    "statusReviewed": {"ukr": "Переглянуто", "eng": "Reviewed"},

    # ── People Review sessions page ──
    "peopleReviewSessions": {"ukr": "Сесії оцінювання персоналу", "eng": "People Review Sessions"},
    "peopleReview": {"ukr": "Оцінювання персоналу", "eng": "People Review"},
    "newSession": {"ukr": "Нова сесія", "eng": "New Session"},
    "createReviewSessionTitle": {"ukr": "Створити сесію оцінювання", "eng": "Create Review Session"},
    "sessionName": {"ukr": "Назва сесії", "eng": "Session name"},
    "periodStart": {"ukr": "Початок періоду", "eng": "Period start"},
    "periodEnd": {"ukr": "Кінець періоду", "eng": "Period end"},
    "openAction": {"ukr": "Відкрити", "eng": "Open"},
    "viewAnalytics": {"ukr": "Переглянути аналітику", "eng": "View analytics"},
    "renameSession": {"ukr": "Перейменувати сесію", "eng": "Rename session"},
    "deleteSessionTooltip": {"ukr": "Видалити сесію (тільки розробник)", "eng": "Delete session (dev only)"},
    "deleteReviewSessionTitle": {"ukr": "Видалити сесію оцінювання", "eng": "Delete review session"},
    "deleteSessionPrefix": {
        "ukr": "Ви збираєтесь назавжди видалити сесію",
        "eng": "You are about to permanently delete the session",
    },
    "deleteSessionSuffixWithCount": {
        "ukr": "та всі ${count} оцінювання працівників у ній. Цю дію неможливо скасувати.",
        "eng": "and all ${count} employee reviews in it. This cannot be undone.",
    },
    "deleteSessionSuffixNoCount": {
        "ukr": "Цю дію неможливо скасувати.",
        "eng": "This cannot be undone.",
    },
    "deleteEverything": {"ukr": "Видалити все", "eng": "Delete everything"},
    "revertToOpen": {"ukr": "Відкрити знову", "eng": "Reopen"},
    "sessionNumber": {"ukr": "Сесія №${id}", "eng": "Session #${id}"},

    # ── Session employees page ──
    "viewOnly": {"ukr": "Тільки перегляд", "eng": "View only"},
    "sessionClosedViewOnly": {
        "ukr": "Цю сесію закрито — дані нижче доступні лише для перегляду.",
        "eng": "This session is closed — the data below is view-only.",
    },
    "addEmployee": {"ukr": "Додати працівника", "eng": "Add employee"},
    "addEmployeeToSession": {"ukr": "Додати працівника до сесії", "eng": "Add employee to session"},
    "filterByEmployee": {"ukr": "Фільтр за працівником", "eng": "Filter by employee"},
    "copyCode": {"ukr": "Копіювати код", "eng": "Copy code"},
    "scoredProgress": {"ukr": "Оцінки: ${count}/${total}", "eng": "Scores: ${count}/${total}"},
    "factsProgress": {"ukr": "Факти: ${count}/${total}", "eng": "Facts: ${count}/${total}"},
    "tempoPresentation": {"ukr": "Презентація TEMPO", "eng": "TEMPO Presentation"},
    "reorderQueue": {"ukr": "Змінити порядок черги", "eng": "Reorder queue"},
    "employeesStillOpenWarning": {
        "ukr": "${count} працівник(ів) ще не оцінено — їх буде пропущено під час презентації",
        "eng": "${count} employee(s) are still open and will be skipped during presentation",
    },
    "employeesStillOpenShort": {"ukr": "${count} ще відкрито", "eng": "${count} still open"},
    "markReviewed": {"ukr": "Позначити переглянутим", "eng": "Mark reviewed"},
    "closeAction": {"ukr": "Закрити", "eng": "Close"},
    "reopenAction": {"ukr": "Відкрити знову", "eng": "Reopen"},
    "revertAction": {"ukr": "Повернути до відкритого", "eng": "Revert to open"},

    # ── Scope settings ──
    "scopeSettings": {"ukr": "Налаштування перегляду", "eng": "View settings"},
    "modeOnlyMyself": {"ukr": "Тільки я", "eng": "Only myself"},

    # ── Session analytics ──
    "sessionAnalytics": {"ukr": "Аналітика сесії", "eng": "Session Analytics"},
    "noEvaluationData": {
        "ukr": "Ще немає даних оцінювання для цієї сесії.",
        "eng": "No evaluation data yet for this session.",
    },
    "overallAverageScore": {"ukr": "Загальний середній бал", "eng": "Overall average score"},
    "scored": {"ukr": "оцінено", "eng": "scored"},

    # ── My Reviews ──
    "myPeopleReviews": {"ukr": "Мої оцінювання", "eng": "My People Reviews"},
    "fillEvaluation": {"ukr": "Заповнити оцінювання", "eng": "Fill Evaluation"},
    "noOpenReviews": {"ukr": "Наразі немає відкритих оцінювань.", "eng": "No open reviews at this time."},
    "notListedInOpenSession": {
        "ukr": "Вас не включено до жодної відкритої сесії оцінювання. Зверніться до свого керівника.",
        "eng": "You are not listed in any open review session. Please contact your supervisor.",
    },

    # ── Reorderable list ──
    "dragToReorderQueue": {"ukr": "Перетягніть, щоб змінити порядок", "eng": "Drag to reorder"},
    "dragToReorder": {"ukr": "Перетягніть, щоб змінити порядок", "eng": "Drag to reorder"},
    "moveToTop": {"ukr": "Перемістити на початок", "eng": "Move to top"},
    "moveUp": {"ukr": "Перемістити вгору", "eng": "Move up"},
    "moveDown": {"ukr": "Перемістити вниз", "eng": "Move down"},
    "moveToBottom": {"ukr": "Перемістити в кінець", "eng": "Move to bottom"},

    # ── Proposed level drawer ──
    "proposedLevel": {"ukr": "Запропонований рівень", "eng": "Proposed Level"},
    "proposedLevelStatusProposed": {"ukr": "Запропоновано", "eng": "Proposed"},
    "proposedLevelStatusValidated": {"ukr": "Підтверджено", "eng": "Validated"},
    "proposedLevelStatusRejected": {"ukr": "Відхилено", "eng": "Rejected"},
    "proposedLevelRequirements": {"ukr": "Вимоги (${filled}/${total})", "eng": "Requirements (${filled}/${total})"},
    "proposedLevelNoRequirements": {
        "ukr": "Для цього рівня не визначено вимог.",
        "eng": "This level has no requirements defined.",
    },

    # ── Review comments ──
    "reviewComments": {"ukr": "Нотатки оцінювання", "eng": "Review Notes"},
    "reviewCommentNoneYet": {"ukr": "Нотаток ще немає.", "eng": "No notes yet."},
    "reviewCommentRoleOversight": {"ukr": "Куратор", "eng": "Oversight"},
    "reviewCommentRoleSupervision": {"ukr": "Супервайзер", "eng": "Supervisor"},
    "reviewCommentVisibilityPrivate": {"ukr": "Приватна", "eng": "Private"},
    "reviewCommentVisibilityPublic": {"ukr": "Публічна", "eng": "Public"},
    "reviewCommentVisibilityToSubject": {"ukr": "Для працівника", "eng": "To employee"},
    "reviewCommentVisibilityOversight": {"ukr": "Для нагляду", "eng": "To oversight"},
    "reviewCommentVisibilityPrivateHint": {"ukr": "Видно лише вам", "eng": "Visible only to you"},
    "reviewCommentVisibilityPublicHint": {"ukr": "Видно всім у цьому оцінюванні", "eng": "Visible to everyone in this review"},
    "reviewCommentVisibilityToSubjectHint": {"ukr": "Видно працівнику та вам", "eng": "Visible to the employee and you"},
    "reviewCommentVisibilityOversightHint": {"ukr": "Видно наглядовим рецензентам та вам", "eng": "Visible to oversight reviewers and you"},

    # ── Children ──
    "childrenUnder14": {"ukr": "Діти ≤ 14", "eng": "Children ≤ 14"},
    "addChild": {"ukr": "Додати дитину", "eng": "Add child"},
    "childBirthDate": {"ukr": "Дата народження дитини", "eng": "Child birth date"},
    "noChildren": {"ukr": "Дітей не зареєстровано", "eng": "No children registered"},
    "yearsOld": {"ukr": "${age} років", "eng": "${age} years old"},
    "employeeChildDeleteSuccess": {
        "ukr": "Запис про дитину (${name}) видалено",
        "eng": "Child record (${name}) deleted",
    },
    "confirmDeleteChildMessage": {
        "ukr": "Ви впевнені, що хочете видалити цей запис про дитину?",
        "eng": "Are you sure you want to delete this child record?",
    },

    # ── Education ──
    "education": {"ukr": "Освіта", "eng": "Education"},
    "addEducation": {"ukr": "Додати освіту", "eng": "Add education"},
    "editEducation": {"ukr": "Редагувати освіту", "eng": "Edit education"},
    "noEducation": {"ukr": "Немає записів про освіту", "eng": "No education records"},
    "institution": {"ukr": "Заклад", "eng": "Institution"},
    "degree": {"ukr": "Ступінь", "eng": "Degree"},
    "speciality": {"ukr": "Спеціальність", "eng": "Speciality"},
    "graduationYear": {"ukr": "Рік випуску", "eng": "Graduation year"},
    "employeeEducationDeleteSuccess": {
        "ukr": "Запис про освіту (${name}) видалено",
        "eng": "Education record (${name}) deleted",
    },
    "confirmDeleteEducationMessage": {
        "ukr": "Ви впевнені, що хочете видалити цей запис про освіту?",
        "eng": "Are you sure you want to delete this education record?",
    },

    # ── Marital status ──
    "maritalStatus": {"ukr": "Сімейний стан", "eng": "Marital status"},
    "editMaritalStatus": {"ukr": "Редагувати сімейний стан", "eng": "Edit marital status"},
    "sex": {"ukr": "Стать", "eng": "Sex"},
    "sexMale": {"ukr": "Чоловіча", "eng": "Male"},
    "sexFemale": {"ukr": "Жіноча", "eng": "Female"},
    "sexMaleShort": {"ukr": "чол", "eng": "male"},
    "sexFemaleShort": {"ukr": "жін", "eng": "female"},
    "maritalMarriedMale": {"ukr": "одружений", "eng": "married"},
    "maritalNotMarriedMale": {"ukr": "неодружений", "eng": "not married"},
    "maritalMarriedFemale": {"ukr": "заміжня", "eng": "married"},
    "maritalNotMarriedFemale": {"ukr": "незаміжня", "eng": "not married"},

    # ── Job info ──
    "job": {"ukr": "Посада", "eng": "Job"},
    "hireDate": {"ukr": "Дата прийому", "eng": "Hire date"},
    "editHireDate": {"ukr": "Редагувати дату прийому", "eng": "Edit hire date"},
    "jobAssignedDate": {"ukr": "Призначено на посаду", "eng": "Job assigned"},
    "editJobAssignedDate": {"ukr": "Редагувати дату призначення", "eng": "Edit job assigned date"},
    "yearsWithCompany": {"ukr": "${years} років", "eng": "${years} years"},
    "levelSenseIncrease": {"ukr": "Підвищення рівня", "eng": "Level increase"},
    "levelSenseSame": {"ukr": "Той самий рівень", "eng": "Same level"},
    "levelSenseDecrease": {"ukr": "Зниження рівня", "eng": "Level decrease"},
    "editCurrentLevel": {"ukr": "Редагувати поточний рівень", "eng": "Edit current level"},

    # ── Personal info ──
    "personalInfo": {"ukr": "Особисті дані", "eng": "Personal Info"},
    "birthDate": {"ukr": "Дата народження", "eng": "Birth date"},
    "editBirthDate": {"ukr": "Редагувати дату народження", "eng": "Edit birth date"},

    # ── Evaluation — dimensions ──
    "rateEachBehaviour": {"ukr": "Оцініть кожну поведінку", "eng": "Rate each behaviour"},
    "doneEditing": {"ukr": "Завершити редагування", "eng": "Done editing"},
    "removeOption": {"ukr": "Видалити", "eng": "Remove"},

    # ── Evaluation — employee data tabs ──
    "employeeFeedback": {"ukr": "Самооцінка працівника", "eng": "Employee self-feedback"},
    "managerFeedback": {"ukr": "Відгук керівника", "eng": "Manager feedback"},
    "results": {"ukr": "Результати", "eng": "Results"},
    "addResult": {"ukr": "Додати результат", "eng": "Add result"},
    "developmentPlan": {"ukr": "План розвитку", "eng": "Development Plan"},
    "addMission": {"ukr": "Додати завдання", "eng": "Add mission"},
    "missionForCompetence": {"ukr": "Для компетенції", "eng": "For competence"},
    "missionNoCompetence": {"ukr": "Без компетенції", "eng": "No competence"},
    "typeMissionPlaceholder": {"ukr": "Введіть завдання...", "eng": "Type a mission..."},
    "requiredTrainings": {"ukr": "Необхідне навчання", "eng": "Required Trainings"},
    "missionsCount": {"ukr": "${count}/${min}–${max} завдань", "eng": "${count}/${min}–${max} missions"},

    # ── Oversight manager picker ──
    "oversightManager": {"ukr": "Наглядовий керівник", "eng": "Oversight Manager"},
    "selectOversightManager": {"ukr": "Оберіть наглядового керівника", "eng": "Select oversight manager"},
    "disconnectOversightManager": {"ukr": "Від'єднати", "eng": "Disconnect"},
    "noOversightManagersAvailable": {"ukr": "Немає доступних наглядових керівників", "eng": "No oversight managers available"},
    "oversightManagerNotSet": {"ukr": "Не встановлено", "eng": "Not set"},

    # ── Talent status ──
    "talentStatusPeriod": {"ukr": "Статус таланту", "eng": "Talent Status"},
    "addTalentAuditJob": {"ukr": "Додати статус таланту", "eng": "Add talent status"},
    "deleteSuccess": {"ukr": "Успішно видалено", "eng": "Deleted successfully"},
}

# ── 3. POST the JSON ─────────────────────────────────────────────────────────
def main():
    token = login()
    headers = {"Authorization": f"Bearer {token}"}
    payload = json.dumps(TRANSLATIONS, ensure_ascii=False, indent=2).encode("utf-8")

    r = httpx.post(
        f"{BASE}/full_msgs/import_json",
        headers=headers,
        files={"file": ("t.json", payload, "application/json")},
        timeout=30,
    )
    r.raise_for_status()
    result = r.json()
    print(f"success_count: {result.get('success_count', '?')}")
    print(f"error_count:   {result.get('error_count', '?')}")
    if result.get("errors"):
        for err in result["errors"]:
            print(f"  - {err}")
    print("Done.")

if __name__ == "__main__":
    main()
