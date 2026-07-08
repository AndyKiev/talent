# backend/utils/person_names.py
"""Pure name helpers for the person essence (no DB access).

Persons store name parts title-case ("Бакулін", "О'Коннор", "Марія-Анна");
employees keep a derived uppercase "LAST FIRST" in employees.name.
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
    """Split a legacy employees.name string as LAST FIRST [PATRONYMIC...].

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


def build_employee_name(last_name: str, first_name: str) -> str:
    """Derived employees.name: 'Last First' — title-case, same as persons.
    Callers pass parts already normalized via normalize_name_part."""
    return f"{last_name} {first_name}".strip()
