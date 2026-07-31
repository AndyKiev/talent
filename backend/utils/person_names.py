# backend/utils/person_names.py
"""Pure name helpers for the person essence (no DB access).

Persons store name parts title-case ("Бакулін", "О'Коннор", "Марія-Анна").
Employees carry NO name column: a display name is composed at serialization
time from the person's parts, ordered by the `surname_first_in_names` setting
(app-level default, per-user overridable). Patronymic is never part of it.
"""

# Characters after which the next letter is re-capitalized inside one part.
_SEPARATORS = ("-", "'", "’", "`")

# Ukrainian given names by sex. Used to derive persons.sex_id when only a name
# is available (seeding, and the one-off repair of the demo data). NOT a
# validation list: an unknown name simply yields None, never a rejection —
# people have names outside any list.
UKRAINIAN_MALE_NAMES = frozenset(
    {
        "Анатолій",
        "Андрій",
        "Артем",
        "Богдан",
        "Валентин",
        "Василь",
        "Віктор",
        "Віталій",
        "Володимир",
        "В'ячеслав",
        "Григорій",
        "Данило",
        "Денис",
        "Дмитро",
        "Євген",
        "Ігор",
        "Іван",
        "Леонід",
        "Максим",
        "Марко",
        "Микола",
        "Михайло",
        "Назар",
        "Олег",
        "Олександр",
        "Остап",
        "Павло",
        "Петро",
        "Роман",
        "Ростислав",
        "Сергій",
        "Степан",
        "Тарас",
        "Юрій",
        "Ярослав",
    }
)
UKRAINIAN_FEMALE_NAMES = frozenset(
    {
        "Алла",
        "Анна",
        "Богдана",
        "Валентина",
        "Василиса",
        "Вікторія",
        "Галина",
        "Дарина",
        "Даяна",
        "Зоряна",
        "Інна",
        "Ірина",
        "Катерина",
        "Лариса",
        "Людмила",
        "Марія",
        "Мирослава",
        "Надія",
        "Наталія",
        "Оксана",
        "Олена",
        "Ольга",
        "Світлана",
        "Соломія",
        "Софія",
        "Тетяна",
        "Христина",
        "Юлія",
    }
)
UKRAINIAN_GIVEN_NAMES = UKRAINIAN_MALE_NAMES | UKRAINIAN_FEMALE_NAMES


def sex_from_patronymic(patronymic: str | None) -> str | None:
    """'male' / 'female' from a patronymic ending, or None.

    Stronger evidence than any name list because it is grammatical rather than
    a lookup — but most rows have no patronymic, so it cannot be the only test.
    """
    if not patronymic:
        return None
    p = patronymic.strip().lower()
    if p.endswith(("ович", "йович", "ич")):
        return "male"
    if p.endswith(("івна", "ївна", "чна")):
        return "female"
    return None


def sex_from_given_name(given_name: str | None) -> str | None:
    """'male' / 'female' from a known Ukrainian given name, else None."""
    if not given_name:
        return None
    name = given_name.strip()
    if name in UKRAINIAN_MALE_NAMES:
        return "male"
    if name in UKRAINIAN_FEMALE_NAMES:
        return "female"
    return None


def normalize_name_part(raw: str | None) -> str | None:
    """Title-case one name part: first letter upper, rest lower, and the letter
    after every hyphen/apostrophe upper (О'КОННОР → О'Коннор, МАРІЯ-АННА →
    Марія-Анна). Returns None for empty/whitespace input."""
    if raw is None:
        return None
    part = raw.strip()
    if not part:
        return None
    chars: list[str] = []
    capitalize_next = True
    for ch in part.lower():
        if capitalize_next and ch.isalpha():
            chars.append(ch.upper())
            capitalize_next = False
        else:
            chars.append(ch)
        if ch in _SEPARATORS:
            capitalize_next = True
    return "".join(chars)


def split_employee_full_name(
    full: str | None,
) -> tuple[str | None, str | None, str | None]:
    """Split a free-form full name as LAST FIRST [PATRONYMIC...].

    Only used where the input really is one untyped string: self-registration
    on the login page, where the person row has to be synthesized from it.

    Extra tokens beyond the second are joined into the patronymic. A single
    token yields (token, None, None). Parts are NOT normalized here."""
    if not full:
        return None, None, None
    tokens = full.split()
    if not tokens:
        return None, None, None
    last = tokens[0]
    first = tokens[1] if len(tokens) > 1 else None
    patronymic = " ".join(tokens[2:]) if len(tokens) > 2 else None
    return last, first, patronymic


def compose_display_name(
    first_name: str | None,
    last_name: str | None,
    surname_first: bool = True,
) -> str:
    """Employee display name composed from the person's parts.

    surname_first=True → "Last First" (the default), False → "First Last".
    Missing parts are skipped, so a person with only one part still renders.
    Callers pass parts already normalized via normalize_name_part."""
    parts = (last_name, first_name) if surname_first else (first_name, last_name)
    return " ".join(p for p in parts if p).strip()
