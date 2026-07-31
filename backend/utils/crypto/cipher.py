# backend/utils/crypto/cipher.py
"""Symmetric encryption for personal-data columns.

Fernet (AES-128-CBC + HMAC-SHA256, authenticated) from `cryptography`. Every
ciphertext carries a version prefix so the storage format can change later
without guessing what a given row holds:

    v1:gAAAAABm...

Two properties the rest of the code relies on:

* **Reading plaintext is not an error.** A value without the prefix is returned
  as-is. That is what lets a column be encrypted by a data migration that has
  not finished, or be rolled back, without every read blowing up in between.
* **Encryption is randomized.** Two rows with the same value produce different
  ciphertext. That is why an encrypted column can never be used for equality
  lookup, ORDER BY, LIKE or a UNIQUE constraint — see `registry.py`.
"""

from cryptography.fernet import Fernet, InvalidToken, MultiFernet

# Storage format marker. Bump only if the algorithm changes, and keep the old
# branch readable — rows written by the previous version stay in the table.
VERSION_PREFIX = "v1:"


class CryptoKeyMissing(RuntimeError):
    """Raised on first use when no key is configured.

    Deliberately a loud failure rather than a silent passthrough: writing
    plaintext into a column the operator believes is encrypted is the worst
    possible outcome.
    """

    def __init__(self) -> None:
        super().__init__(
            "No encryption key configured. Set APP_CONFIG__CRYPTO__KEY in .env "
            "(generate one with: python -m backend.scripts.generate_crypto_key). "
            "Personal-data columns cannot be read or written without it."
        )


_fernet: MultiFernet | None = None


def _cipher() -> MultiFernet:
    """The cipher, built once. Encrypts with the current key; decrypts with the
    current key first and then each old key, so a rotation can re-encrypt rows
    lazily instead of in one atomic pass."""
    global _fernet
    if _fernet is None:
        from backend.config.config import settings

        primary = (settings.crypto.key or "").strip()
        if not primary:
            raise CryptoKeyMissing()
        keys = [primary] + [
            k.strip() for k in (settings.crypto.old_keys or "").split(",") if k.strip()
        ]
        _fernet = MultiFernet([Fernet(k.encode()) for k in keys])
    return _fernet


def reset_cipher_cache() -> None:
    """Drop the cached cipher. Only for tests and key-rotation scripts that
    change the configured key inside a live process."""
    global _fernet
    _fernet = None


def encrypt(value: str | None) -> str | None:
    """Plaintext -> 'v1:<token>'. None and empty string pass through unchanged
    so a nullable column keeps meaning NULL rather than 'encrypted emptiness'."""
    if value is None or value == "":
        return value
    return VERSION_PREFIX + _cipher().encrypt(value.encode()).decode()


def decrypt(value: str | None) -> str | None:
    """'v1:<token>' -> plaintext. A value with no prefix is already plaintext
    and is returned unchanged (see the module docstring)."""
    if value is None or value == "":
        return value
    if not value.startswith(VERSION_PREFIX):
        return value
    token = value[len(VERSION_PREFIX) :]
    try:
        return _cipher().decrypt(token.encode()).decode()
    except InvalidToken as exc:
        # Authenticated encryption: this means the wrong key, or a tampered
        # row. Both are situations where returning garbage would be worse than
        # failing.
        raise ValueError(
            "Could not decrypt a personal-data value: wrong key, or the row was "
            "modified outside the application. Check APP_CONFIG__CRYPTO__KEY "
            "(and APP_CONFIG__CRYPTO__OLD_KEYS after a rotation)."
        ) from exc


def is_encrypted(value: str | None) -> bool:
    """Whether a stored value is already in ciphertext form. Used by the data
    migration so re-running it never double-encrypts."""
    return bool(value) and value.startswith(VERSION_PREFIX)
