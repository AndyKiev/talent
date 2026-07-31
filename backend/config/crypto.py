from pydantic import BaseModel


class CryptoConfig(BaseModel):
    """Key material for column-level encryption of personal data at rest.

    Read from `APP_CONFIG__CRYPTO__KEY` (and optionally
    `APP_CONFIG__CRYPTO__OLD_KEYS`), the same idiom as every other secret here.

    Defaulted to empty rather than required on purpose: a missing key must not
    stop the app from booting for work that never touches an encrypted column
    (migrations, seeds, the login page). The failure surfaces at first use, from
    `backend/utils/crypto/cipher.py`, naming the env var — which is a far more
    useful error than an import-time crash with no context.

    What this protects: a stolen database dump, a backup file, a read-only DBA
    or anyone running a plain SELECT. What it does NOT protect: an attacker who
    can run application code, since the app must be able to decrypt.
    """

    # Fernet key, urlsafe-base64, 32 bytes. Generate with:
    #   python -m backend.scripts.generate_crypto_key
    key: str = ""

    # Comma-separated previous keys, newest first. Decryption tries the current
    # key then each of these, so a rotation can re-encrypt gradually instead of
    # needing one atomic pass over every table.
    old_keys: str = ""
