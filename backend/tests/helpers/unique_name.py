"""Unique-name convention shared by all E2E-created records.

Every record any test creates MUST be named with this prefix so the janitor
(backend/tests/cleanup_e2e_data.py) can find and delete leftovers after a
crashed run. Mirrors e2e/helpers/uniqueName.ts on the Playwright side.

IMPORTANT: max_length must match the essence's schema max_length (check the
_schema.py Field(..., max_length=...)) - an oversized name gets a 422 from
the API. When trimming, the SLUG is shortened, never the random tail -
otherwise names stop being unique.
"""

import random
import string
from datetime import datetime

E2E_PREFIX = "E2E_"
_ALPHABET = string.ascii_uppercase + string.digits


def _rand_token(length: int) -> str:
    return "".join(random.choices(_ALPHABET, k=length))


def unique_name(slug: str, max_length: int = 64) -> str:
    stamp = datetime.now().strftime("%Y%m%d%H%M%S")
    suffix = f"_{stamp}_{_rand_token(4)}"
    room = max_length - len(E2E_PREFIX) - len(suffix)
    if room < 1:
        # Field too short for the full convention - prefix + random only.
        return f"{E2E_PREFIX}{_rand_token(max_length - len(E2E_PREFIX))}"
    return f"{E2E_PREFIX}{slug[:room]}{suffix}"


def unique_key(max_length: int = 8) -> str:
    """Short unique identifier for `key`-style fields (often max 8 chars).

    NEVER build keys by slicing unique_name() - the random tail is what makes
    it unique, and a slice keeps only the constant prefix.
    """
    prefix = "E2E_" if max_length >= 8 else "E"
    return f"{prefix}{_rand_token(max_length - len(prefix))}"
