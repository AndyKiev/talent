# backend/api_v1/msg_bulk/msg_bulk_service.py
import io
import json

from fastapi import HTTPException
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from backend.api_v1.msg_full.msg_full_repository import MsgFullRepository
from backend.api_v1.msg_full.msg_full_schema import (
    FullMsgCreate,
    FullMsgUpdate,
    MsgItem,
)
from backend.api_v1.msg_full.msg_full_service import MsgFullService
from backend.api_v1.msg_bulk.msg_bulk_schema import BulkImportResult
from backend.api_v1.msg_key.msg_key_model import MsgKey
from backend.api_v1.msg_pg.msg_model import Msg
from backend.utils.case_converter import to_camel_case


_HEADER_FILL = PatternFill(start_color="1F4E79", end_color="1F4E79", fill_type="solid")
_HEADER_FONT = Font(color="FFFFFF", bold=True)
_KEY_FILL = PatternFill(start_color="D6E4F0", end_color="D6E4F0", fill_type="solid")


class MsgBulkService:
    """
    Handles bulk import/export of translations in JSON and Excel formats.
    Delegates all read/write of individual MsgKey records to MsgFullService
    so there is a single source of truth for upsert logic.
    """

    def __init__(
        self,
        repository: MsgFullRepository,
        session: AsyncSession,
    ) -> None:
        self._repository = repository
        self._session = session
        # Reuse MsgFullService so upsert rules live in one place
        self._full_svc = MsgFullService(repository, session)

    # ── Helpers ────────────────────────────────────────────────────────────

    async def _lang_short_to_id(self) -> dict[str, int]:
        from backend.api_v1.lang.lang_model import Lang

        result = await self._session.execute(select(Lang))
        return {lang.short_name: lang.id for lang in result.scalars().all()}

    async def _lang_id_to_short(self) -> dict[int, str]:
        from backend.api_v1.lang.lang_model import Lang

        result = await self._session.execute(select(Lang))
        return {lang.id: lang.short_name for lang in result.scalars().all()}

    # ── JSON export ────────────────────────────────────────────────────────

    async def export_json(self) -> bytes:
        """
        Returns UTF-8–encoded JSON bytes.
        Shape: { "camelCaseKey": { "ukr": "...", "eng": "..." }, ... }
        """
        msg_keys = await self._repository.get_all()
        out: dict = {}
        for mk in msg_keys:
            lang_map = {
                msg.lang_data.short_name: msg.value
                for msg in (mk.msg or [])
                if msg.lang_data
            }
            out[to_camel_case(mk.name)] = lang_map
        return json.dumps(
            dict(sorted(out.items())), ensure_ascii=False, indent=2
        ).encode("utf-8")

    # ── JSON import ────────────────────────────────────────────────────────

    async def import_json(self, raw: bytes) -> BulkImportResult:
        """
        Accepts raw JSON bytes (from file upload or pasted text).
        Expected shape: { "keyName": { "ukr": "...", "eng": "..." }, ... }
        """
        try:
            data = json.loads(raw.decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError) as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid JSON: {exc}",
            )

        if not isinstance(data, dict):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="JSON root must be an object",
            )

        return await self._upsert_from_dict(data)

    # ── Excel export ───────────────────────────────────────────────────────

    async def export_excel(self) -> bytes:
        """
        Returns XLSX bytes.
        Columns: key_name | <lang_short_name> ...
        One row per MsgKey, one column per language.
        """
        msg_keys = await self._repository.get_all()

        # Collect ordered language short names
        lang_short_names: list[str] = []
        seen: set[str] = set()
        for mk in msg_keys:
            for msg in mk.msg or []:
                if msg.lang_data and msg.lang_data.short_name not in seen:
                    lang_short_names.append(msg.lang_data.short_name)
                    seen.add(msg.lang_data.short_name)
        lang_short_names.sort()

        wb = Workbook()
        ws = wb.active
        ws.title = "Translations"

        # Header row
        headers = ["key_name"] + lang_short_names
        for col_idx, header in enumerate(headers, start=1):
            cell = ws.cell(row=1, column=col_idx, value=header)
            cell.font = _HEADER_FONT
            cell.fill = _HEADER_FILL
            cell.alignment = Alignment(horizontal="center")

        # Data rows
        for row_idx, mk in enumerate(msg_keys, start=2):
            lang_value_map = {
                msg.lang_data.short_name: msg.value
                for msg in (mk.msg or [])
                if msg.lang_data
            }
            ws.cell(row=row_idx, column=1, value=mk.name).fill = _KEY_FILL
            for col_idx, short_name in enumerate(lang_short_names, start=2):
                ws.cell(
                    row=row_idx,
                    column=col_idx,
                    value=lang_value_map.get(short_name, ""),
                )

        # Column widths
        ws.column_dimensions[get_column_letter(1)].width = 40
        for col_idx in range(2, len(headers) + 1):
            ws.column_dimensions[get_column_letter(col_idx)].width = 50

        buf = io.BytesIO()
        wb.save(buf)
        return buf.getvalue()

    # ── Excel import ───────────────────────────────────────────────────────

    async def import_excel(self, raw: bytes) -> BulkImportResult:
        """
        Accepts XLSX bytes.
        Expected layout:
          Row 1 (header): key_name | <lang1> | <lang2> ...
          Row 2+:         <key>    | <value1> | <value2> ...
        Empty value cells are skipped (not deleted).
        """
        try:
            wb = load_workbook(io.BytesIO(raw), read_only=True, data_only=True)
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Cannot parse Excel file: {exc}",
            )

        ws = wb.active
        rows = list(ws.iter_rows(values_only=True))
        if not rows:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Excel file is empty",
            )

        header = [str(h).strip() if h is not None else "" for h in rows[0]]
        if not header or header[0].lower() != "key":
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="First column header must be 'key'",
            )

        lang_cols: list[str] = header[1:]  # short_names in column order

        data: dict[str, dict[str, str]] = {}
        for row in rows[1:]:
            if not row or row[0] is None:
                continue
            key = str(row[0]).strip()
            if not key:
                continue
            translations: dict[str, str] = {}
            for col_idx, short_name in enumerate(lang_cols, start=1):
                if not short_name:
                    continue
                raw_val = row[col_idx] if col_idx < len(row) else None
                if raw_val is not None:
                    val = str(raw_val).strip()
                    if val:
                        translations[short_name] = val
            data[key] = translations

        return await self._upsert_from_dict(data)

    # ── Shared upsert logic ────────────────────────────────────────────────

    async def _upsert_from_dict(
        self, data: dict[str, dict[str, str]]
    ) -> BulkImportResult:
        """
        table_data shape: { "key_name": { "lang_short": "value", ... }, ... }
        Uses MsgFullService for consistent create/update rules.
        """
        lang_short_to_id = await self._lang_short_to_id()
        success, errors = 0, []

        for name, translations in data.items():
            name = name.strip()
            if not name:
                errors.append("Empty key — skipped")
                continue
            if not isinstance(translations, dict):
                errors.append(f"Key '{name}': translations must be an object — skipped")
                continue

            msg_items = [
                MsgItem(value=v.strip(), lang_id=lang_short_to_id[k])
                for k, v in translations.items()
                if k in lang_short_to_id and isinstance(v, str) and v.strip()
            ]
            if not msg_items:
                errors.append(f"Key '{name}': no valid translations — skipped")
                continue

            try:
                existing = await self._repository.get_by_field("name", name)
                if existing:
                    await self._full_svc.update_full_message(
                        existing.id, FullMsgUpdate(name=name, msg=msg_items)
                    )
                else:
                    await self._full_svc.create_full_messages(
                        [FullMsgCreate(name=name, msg=msg_items)]
                    )
                success += 1
            except HTTPException as exc:
                errors.append(f"Key '{name}': {exc.detail}")
            except Exception as exc:
                errors.append(f"Key '{name}': {exc}")

        return BulkImportResult(
            success_count=success,
            error_count=len(errors),
            total_processed=success + len(errors),
            errors=errors or None,
        )
