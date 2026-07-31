# backend/utils/crypto/types.py
"""SQLAlchemy column types that encrypt on write and decrypt on read.

Transparent to everything above the model: a service still assigns a `date` to
`Person.birth_date` and reads a `date` back. Only the bytes in Postgres change.

They work for column-only selects too (`select(Model.col)`), not just entity
loads, because the type is attached to the Column — which matters here, since
several hot paths select these columns directly to avoid relationship loads.
"""

from datetime import date

from sqlalchemy import Text
from sqlalchemy.types import TypeDecorator

from backend.utils.crypto.cipher import decrypt, encrypt


class EncryptedString(TypeDecorator):
    """An encrypted text column.

    `impl` is Text, never String(n): ciphertext is ~2x the plaintext plus the
    prefix, so a length limit sized for human input would truncate it. Validate
    length in the Pydantic schema instead, where the plaintext still exists.
    """

    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        return encrypt(value)

    def process_result_value(self, value, dialect):
        return decrypt(value)


class EncryptedDate(TypeDecorator):
    """An encrypted date column, stored as encrypted ISO text.

    The column type in Postgres becomes text, so anything that needed SQL to
    understand this as a date — a range filter, an ORDER BY, an age computed in
    SQL — stops being possible. That is the trade, and it is why only columns
    that are already handled in Python belong here.
    """

    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        # Accept a str as well as a date: seeds and raw SQL paths pass ISO text.
        raw = value.isoformat() if isinstance(value, date) else str(value)
        return encrypt(raw)

    def process_result_value(self, value, dialect):
        plain = decrypt(value)
        if plain is None or plain == "":
            return None
        return date.fromisoformat(plain)
