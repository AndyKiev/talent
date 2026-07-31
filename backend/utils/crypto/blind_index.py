# backend/utils/crypto/blind_index.py
"""Deterministic lookup key for an encrypted column ("blind index").

Fernet is randomized: the same name encrypts to a different value every time.
That is what makes it safe, and it is also why an encrypted column can no
longer answer `WHERE last_name = ?` or carry a UNIQUE constraint.

A blind index restores exactly those two operations and nothing else. It stores
`HMAC-SHA256(secret, normalized_value)` alongside the ciphertext: equal inputs
give an equal hash, so equality and uniqueness work, while the hash itself
reveals nothing without the key — and is not reversible even with it.

What it deliberately does NOT give back: ordering, prefix search, `LIKE`. A hash
has no order relation to the value it came from. Anything that needs those must
decrypt and work in Python.

**Trade-off, stated plainly.** A blind index leaks equality: someone with the
database can see that two people share a surname, without learning the surname.
For namesake detection — which is the whole reason this column is looked up —
that is precisely the information we are storing on purpose.
"""

import hashlib
import hmac

from backend.utils.crypto.cipher import CryptoKeyMissing


def _secret() -> bytes:
    """HMAC secret, derived from the encryption key rather than configured
    separately: one key to manage, and the derivation keeps the HMAC secret
    distinct from the key Fernet uses, so neither weakens the other."""
    from backend.config.config import settings

    key = (settings.crypto.key or "").strip()
    if not key:
        raise CryptoKeyMissing()
    return hashlib.sha256(b"talent-blind-index-v1|" + key.encode()).digest()


def normalize_for_index(value: str | None) -> str:
    """Casefold + strip, so 'Бакулін', ' бакулін ' and 'БАКУЛІН' share a hash.

    Mirrors the `func.lower(...) == func.lower(...)` comparison this replaces —
    case-insensitivity has to move INTO the hash, because SQL can no longer see
    the value to lower it.
    """
    return (value or "").strip().casefold()


def name_blind_index(first_name: str | None, last_name: str | None) -> str:
    """Lookup key for a (last, first) pair — 64 hex chars.

    Ordered last-then-first with a separator that cannot occur in a name, so
    ('Іван', 'Петренко') and ('Петренко', 'Іван') never collide.
    """
    payload = f"{normalize_for_index(last_name)}\x1f{normalize_for_index(first_name)}"
    return hmac.new(_secret(), payload.encode(), hashlib.sha256).hexdigest()
