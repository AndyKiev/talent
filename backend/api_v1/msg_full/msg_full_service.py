import json
from typing import List, Optional

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.errors import NotFoundError
from backend.api_v1.msg_full.msg_full_repository import MsgFullRepository
from backend.api_v1.msg_full.msg_full_schema import (
    FullMsgCreate,
    FullMsgRead,
    FullMsgUpdate,
    LangRead,
    MsgItem,
    MsgItemRead,
)
from backend.api_v1.msg_key.msg_key_model import MsgKey
from backend.api_v1.msg_pg.msg_model import Msg
from backend.utils.case_converter import to_camel_case


class MsgFullService(BaseService):
    def __init__(
        self,
        repository: MsgFullRepository,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, session=session)

    # ── Read ───────────────────────────────────────────────────────────────

    async def get_full_messages(self) -> List[FullMsgRead]:
        msg_keys = await self.repository.get_all()
        return [self._to_schema(mk) for mk in msg_keys]

    async def get_full_message_by_id(self, msg_key_id: int) -> FullMsgRead:
        msg_key = await self.repository.get_by_id_full(msg_key_id)
        if not msg_key:
            exc = NotFoundError("MsgKey", "id", msg_key_id)
            exc.message_key = "essenceNotFoundById"
            exc.template_vars = {"essence": "MsgKey", "id": msg_key_id}
            exc.fallback = f"MsgKey with id {msg_key_id} not found"
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=exc.fallback)
        return self._to_schema(msg_key)

    # ── Write ──────────────────────────────────────────────────────────────

    async def create_full_messages(self, data_in: List[FullMsgCreate]) -> None:
        """
        Upsert MsgKey by name, then insert child Msg rows.
        Rolls back and re-raises on any failure.
        """
        try:
            for item in data_in:
                existing = await self.repository.get_by_field("name", item.name)
                if existing:
                    msg_key_id = existing.id
                else:
                    new_key = MsgKey(name=item.name)
                    self.session.add(new_key)
                    await self.session.flush()
                    await self.session.refresh(new_key)
                    msg_key_id = new_key.id

                for msg_item in (item.msg or []):
                    self.session.add(
                        Msg(value=msg_item.value, msg_key_id=msg_key_id, lang_id=msg_item.lang_id)
                    )
            await self.session.commit()
        except IntegrityError as e:
            await self.session.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e.orig))

    async def update_full_message(
        self, msg_key_id: int, data_update: FullMsgUpdate
    ) -> FullMsgRead:
        """
        Diff-patch child Msgs by lang_id:
          existing + non-empty value → update in place
          existing + empty value     → delete
          new lang_id + non-empty    → insert
        """
        msg_key = await self.repository.get_by_id_full(msg_key_id)
        if not msg_key:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"MsgKey {msg_key_id} not found")

        try:
            if data_update.name:
                msg_key.name = data_update.name

            if data_update.msg:
                existing_by_lang = {m.lang_id: m for m in msg_key.msg}
                for msg_item in data_update.msg:
                    if msg_item.lang_id in existing_by_lang:
                        existing = existing_by_lang[msg_item.lang_id]
                        if msg_item.value == "":
                            await self.session.delete(existing)
                        else:
                            existing.value = msg_item.value
                    elif msg_item.value:
                        self.session.add(
                            Msg(value=msg_item.value, msg_key_id=msg_key_id, lang_id=msg_item.lang_id)
                        )

            await self.session.commit()
        except Exception:
            await self.session.rollback()
            raise

        return await self.get_full_message_by_id(msg_key_id)

    async def delete_full_message(self, msg_key_id: int) -> None:
        msg_key = await self.repository.get_by_id_full(msg_key_id)
        if not msg_key:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"MsgKey {msg_key_id} not found",
            )
        await self.session.delete(msg_key)
        await self.session.commit()
    # ── Import / Export ────────────────────────────────────────────────────



    async def export_to_json(self) -> str:
        msg_keys = await self.repository.get_all()
        out: dict = {}
        for mk in msg_keys:
            lang_map = {
                msg.lang_data.short_name: msg.value
                for msg in (mk.msg or [])
                if msg.lang_data
            }
            out[to_camel_case(mk.name)] = lang_map
        return json.dumps(dict(sorted(out.items())), ensure_ascii=False, indent=2)

    async def import_from_json(self, file_content: bytes) -> dict:
        try:
            data = json.loads(file_content.decode("utf-8"))
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON: {e}")

        if not isinstance(data, dict):
            raise ValueError("JSON root must be an object")

        # lang short_name → id
        from backend.api_v1.lang.lang_model import Lang
        result = await self.session.execute(select(Lang))
        lang_by_short = {lang.short_name: lang.id for lang in result.scalars().all()}

        success, errors = 0, []

        for name, translations in data.items():
            name = name.strip()
            if not name:
                errors.append("Empty key name skipped")
                continue
            if not isinstance(translations, dict):
                errors.append(f"Key '{name}': translations must be an object")
                continue

            msg_items = [
                MsgItem(value=v.strip(), lang_id=lang_by_short[k])
                for k, v in translations.items()
                if k in lang_by_short and isinstance(v, str) and v.strip()
            ]
            if not msg_items:
                errors.append(f"Key '{name}': no valid translations")
                continue

            try:
                existing = await self.repository.get_by_field("name", name)
                if existing:
                    await self.update_full_message(existing.id, FullMsgUpdate(name=name, msg=msg_items))
                else:
                    await self.create_full_messages([FullMsgCreate(name=name, msg=msg_items)])
                success += 1
            except Exception as e:
                errors.append(f"Key '{name}': {e}")

        return {
            "success_count": success,
            "error_count": len(errors),
            "total_processed": success + len(errors),
            "errors": errors or None,
        }

    # ── Private ────────────────────────────────────────────────────────────

    @staticmethod
    def _to_schema(msg_key: MsgKey) -> FullMsgRead:
        msg_list = [
            MsgItemRead(
                value=msg.value,
                lang_data=LangRead(
                    id=msg.lang_data.id,
                    name=msg.lang_data.name,
                    short_name=msg.lang_data.short_name,
                ),
            )
            for msg in (msg_key.msg or [])  # .name → .msg
            if msg.lang_data
        ]
        return FullMsgRead(id=msg_key.id, name=msg_key.name, msg=msg_list or None)