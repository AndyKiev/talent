"""Reusable server-side translation upsert, for essences that let an admin enter
a key's EN/UK text inline (e.g. review levels/requirements).

Reuses ``MsgFullService.import_from_json`` so the same upsert logic + lang lookup
is shared. Runs on the caller's session, so it participates in the caller's flow
and needs no separate msg-create permission (the gate lives on the msg views).
"""

import json
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.msg_full.msg_full_service import MsgFullService
from backend.api_v1.msg_full.msg_full_repository import MsgFullRepository


async def upsert_translations(
    session: AsyncSession, entries: dict[str, dict[str, Optional[str]]]
) -> None:
    """Upsert ``{key: {"eng": ..., "ukr": ...}}``. Keys/langs with empty values are
    dropped; a no-op when nothing usable remains (so callers can pass blanks)."""
    payload: dict[str, dict[str, str]] = {}
    for key, langs in entries.items():
        if not key:
            continue
        clean = {
            lang: val.strip()
            for lang, val in langs.items()
            if isinstance(val, str) and val.strip()
        }
        if clean:
            payload[key] = clean
    if not payload:
        return
    service = MsgFullService(MsgFullRepository(session=session), session=session)
    await service.import_from_json(json.dumps(payload).encode("utf-8"))
