# backend/scripts/generate_crypto_key.py
"""Print a fresh Fernet key for APP_CONFIG__CRYPTO__KEY.

    python -m backend.scripts.generate_crypto_key

Writes nothing. Paste the value into `.env` yourself, and keep a copy somewhere
safe BEFORE encrypting any data: without the key the encrypted columns are
unrecoverable — that is the entire point of them.

Rotating: move the current key to APP_CONFIG__CRYPTO__OLD_KEYS, put the new one
in APP_CONFIG__CRYPTO__KEY, then re-encrypt with
`python -m backend.scripts.encrypt_personal_data --reencrypt`.
"""

from cryptography.fernet import Fernet


def main() -> None:
    key = Fernet.generate_key().decode()
    print(key)
    print()
    print("Add to .env:")
    print(f"APP_CONFIG__CRYPTO__KEY={key}")


if __name__ == "__main__":
    main()
