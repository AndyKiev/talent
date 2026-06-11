"""Load translations.json into the database (msg_key / msg tables).

This is the DEFAULT way to add translations in this project:
  1. Add / edit keys in the repo-root ``translations.json``
     (shape: ``{ "camelCaseKey": { "ukr": "...", "eng": "..." }, ... }``).
  2. Run this loader to upsert them into the DB.

It reuses the exact same ``MsgBulkService.import_json`` upsert that the
developer "Import JSON" dialog calls, so the result is identical to importing
through the UI. Upsert only — existing keys are updated, nothing is deleted.

Run (from repo root, using the backend venv):
    backend/.venv/Scripts/python.exe scripts/load_translations.py
or:
    cd backend && poetry run python ../scripts/load_translations.py

Requires the Postgres container to be up (see APP_CONFIG__DB__* in .env).
"""
import asyncio
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT))

from dotenv import load_dotenv  # noqa: E402

load_dotenv(REPO_ROOT / ".env")

from backend.database.db_helper import db_helper  # noqa: E402
from backend.api_v1.msg_full.msg_full_repository import MsgFullRepository  # noqa: E402
from backend.api_v1.msg_bulk.msg_bulk_service import MsgBulkService  # noqa: E402

TRANSLATIONS_FILE = REPO_ROOT / "translations.json"


async def main() -> None:
    raw = TRANSLATIONS_FILE.read_bytes()
    async with db_helper.session_factory() as session:
        service = MsgBulkService(MsgFullRepository(session=session), session)
        result = await service.import_json(raw)

    print(
        f"OK  imported={result.success_count}  "
        f"errors={result.error_count}  total={result.total_processed}"
    )
    for err in result.errors or []:
        print("  -", err)
    await db_helper.dispose()


if __name__ == "__main__":
    asyncio.run(main())
