"""Server-side translation helpers over the msg_keys / msgs tables.

The DB is the source of truth for all localized text (CLAUDE.md); these helpers
let any backend code — services, document renderers (TEMPO PDF/PPTX, HR Excel),
dev tools — resolve message keys to the target language without a service
instance. In-code fallbacks passed by callers must always be English.

lang ids follow the langs table: 2 = english, 3 = ukrainian.
"""

from typing import Any, Dict, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.msg_key.msg_key_model import MsgKey
from backend.api_v1.msg_pg.msg_model import Msg

LANG_ID_ENG = 2
LANG_ID_UKR = 3


async def translate_key(
    session: AsyncSession,
    message_key: str,
    lang_id: int,
    variables: Optional[Dict[str, Any]] = None,
    fallback: str = "",
) -> str:
    """Resolve one message key for the given language.

    Interpolates ${variable} placeholders with the supplied variables dict.
    Returns the (English) fallback when the key is missing or the lookup fails.
    """
    try:
        stmt = (
            select(Msg.value)
            .join(MsgKey)
            .where(MsgKey.name == message_key, Msg.lang_id == lang_id)
        )
        result = await session.execute(stmt)
        message_template = result.scalar_one_or_none()

        if not message_template:
            return fallback

        if variables:
            for key, value in variables.items():
                placeholder = f"${{{key}}}"
                message_template = message_template.replace(placeholder, str(value))

        return message_template

    except Exception:
        return fallback


async def translate_keys(
    session: AsyncSession,
    keys: Dict[str, str],
    lang_id: int,
) -> Dict[str, str]:
    """Resolve many message keys for the given language in ONE query.

    ``keys`` maps message_key -> English fallback; the result maps every
    requested key to its resolved value (fallback when missing/failed).
    No ${variable} interpolation — batch resolution is for plain labels.
    """
    resolved = dict(keys)
    if not keys:
        return resolved
    try:
        stmt = (
            select(MsgKey.name, Msg.value)
            .join(MsgKey)
            .where(MsgKey.name.in_(keys), Msg.lang_id == lang_id)
        )
        result = await session.execute(stmt)
        for name, value in result.all():
            if value:
                resolved[name] = value
    except Exception:
        pass
    return resolved
