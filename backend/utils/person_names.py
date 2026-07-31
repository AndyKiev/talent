# backend/utils/person_names.py
"""Pure name helpers for the person essence (no DB access).

Persons store name parts title-case ("Бакулін", "О'Коннор", "Марія-Анна").
Employees carry NO name column: a display name is composed at serialization
time from the person's parts, ordered by the `surname_first_in_names` setting
(app-level default, per-user overridable). Patronymic is never part of it.
"""

# Characters after which the next letter is re-capitalized inside one part.
_SEPARATORS = ("-", "'", "’", "`")


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
