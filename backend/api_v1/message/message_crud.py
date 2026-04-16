import io  # Keep this at the top
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
from typing import List, Optional
from fastapi import Depends, HTTPException
from sqlalchemy.exc import IntegrityError

from backend.api_v1.message.message_model import Lang, MsgKey, Msg
from backend.api_v1.lang.lang_schema import (
    LangRead,
    LangCreate
)
from backend.api_v1.message.message_schema import (
    MsgKeyRead,
    MsgKeyCreate,
    MsgRead,
    MsgCreate,
    FullMsgRead,
    FullMsgCreate,
    FullMsgUpdate,
    MsgFullMsg,
)
from backend.database.db_helper import db_helper


class LangCRUD:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_all_langs(self) -> List[LangRead]:
        """Get all languages - SIMPLE format without relationships"""
        stmt = select(Lang).order_by(desc(Lang.id))
        result = await self.session.execute(stmt)
        langs = result.scalars().all()
        return [
            LangRead.model_validate(
                {"id": lang.id, "name": lang.name, "short_name": lang.short_name}
            )
            for lang in langs
        ]

    async def get_lang_by_id(self, lang_id: int) -> Optional[LangRead]:
        """Get language by ID - SIMPLE format"""
        stmt = select(Lang).where(Lang.id == lang_id)
        result = await self.session.execute(stmt)
        lang = result.scalar_one_or_none()
        if lang:
            return LangRead.model_validate(
                {"id": lang.id, "name": lang.name, "short_name": lang.short_name}
            )
        return None

    async def create_lang(self, lang_in: LangCreate) -> LangRead:
        """Create a new language"""
        try:
            lang = Lang(**lang_in.model_dump())
            self.session.add(lang)
            await self.session.commit()
            await self.session.refresh(lang)
            return LangRead.model_validate(
                {"id": lang.id, "name": lang.name, "short_name": lang.short_name}
            )
        except IntegrityError:
            await self.session.rollback()
            raise HTTPException(status_code=209, detail="Language already exists")

    async def delete_lang(self, lang_id: int) -> None:
        """Delete a language"""
        stmt = select(Lang).where(Lang.id == lang_id)
        result = await self.session.execute(stmt)
        lang = result.scalar_one_or_none()

        if not lang:
            raise ValueError(f"Language {lang_id} not found")

        try:
            await self.session.delete(lang)
            await self.session.commit()
        except IntegrityError:
            await self.session.rollback()
            raise HTTPException(
                status_code=400, detail="Cannot delete, used in other records"
            )


class MsgKeyCRUD:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def import_from_excel(self, file_content: bytes, lang_crud: LangCRUD) -> dict:
        """Import translations from Excel file"""
        try:
            workbook = load_workbook(io.BytesIO(file_content))
            sheet = workbook.active

            # Get headers from first row
            headers = [
                str(cell.value).strip() if cell.value else "" for cell in sheet[1]
            ]

            # First column must be 'Key'
            if headers[0].lower() != "key":
                raise ValueError("First column must be 'Key'")

            # Get available languages from database
            all_langs = await lang_crud.get_all_langs()
            lang_mapping = {lang.short_name.lower(): lang.id for lang in all_langs}

            # Map header columns to language IDs (skip first 'Key' column)
            lang_columns = {}
            for idx, header in enumerate(
                headers[1:], start=1
            ):  # Start from second column
                header_lower = header.lower()
                if header_lower in lang_mapping:
                    lang_columns[idx] = {
                        "lang_id": lang_mapping[header_lower],
                        "short_name": header_lower,
                    }

            if not lang_columns:
                raise ValueError("No valid language columns found in Excel file")

            # Process data rows
            success_count = 0
            error_count = 0
            errors = []

            for row_idx, row in enumerate(
                sheet.iter_rows(min_row=2, values_only=True), start=2
            ):
                try:
                    if not row:
                        continue

                    key_name = str(row[0]).strip() if row[0] else ""

                    # Skip empty keys
                    if not key_name:
                        error_count += 1
                        errors.append(f"Row {row_idx}: Empty key name")
                        continue

                    # Prepare translations for available languages
                    translations = []
                    for col_idx, lang_info in lang_columns.items():
                        if col_idx < len(row):
                            value = str(row[col_idx]).strip() if row[col_idx] else ""
                            if value:  # Only add if value is not empty
                                translations.append(
                                    {"lang_id": lang_info["lang_id"], "value": value}
                                )

                    # Skip if no translations provided
                    if not translations:
                        error_count += 1
                        errors.append(
                            f"Row {row_idx}: No translations provided for key '{key_name}'"
                        )
                        continue

                    # Check if key exists
                    existing_keys = await self.get_all_msg_keys()
                    existing_key_dict = {key.key_name: key.id for key in existing_keys}

                    if key_name in existing_key_dict:
                        # Update existing key
                        update_data = FullMsgUpdate(key_name=key_name, msg=translations)
                        await self.update_full_message(
                            existing_key_dict[key_name], update_data
                        )
                    else:
                        # Create new key
                        create_data = [
                            FullMsgCreate(key_name=key_name, msg=translations)
                        ]
                        await self.create_full_message(create_data)

                    success_count += 1

                except Exception as e:
                    error_count += 1
                    errors.append(f"Row {row_idx}: {str(e)}")
                    continue

            return {
                "success_count": success_count,
                "error_count": error_count,
                "total_processed": success_count + error_count,
                "errors": errors if errors else None,
            }

        except Exception as e:
            raise ValueError(f"Error processing Excel file: {str(e)}")

    async def export_to_excel(self, lang_crud: LangCRUD) -> bytes:
        """Export translations to Excel file bytes"""
        try:
            import io

            # Get all languages ordered by ID
            all_langs = await lang_crud.get_all_langs()
            if not all_langs:
                raise ValueError("No languages found in database")

            # Get all full messages
            full_messages = await self.get_full_messages()

            # Create workbook and sheet
            wb = Workbook()
            ws = wb.active
            ws.title = "Translations"

            # Create headers: Key + all language short_names
            headers = ["Key"] + [lang.short_name for lang in all_langs]
            ws.append(headers)

            # Style header row
            header_font = Font(bold=True)
            for cell in ws[1]:
                cell.font = header_font

            # Create a mapping for quick lookup of translations
            # Structure: {key_name: {lang_short_name: value}}
            translation_map = {}
            for message in full_messages:
                key_translations = {}
                for msg in message.msg or []:
                    if msg.lang_data:
                        key_translations[msg.lang_data.short_name] = msg.value
                translation_map[message.key_name] = key_translations

            # Get all unique keys (including those without translations)
            all_keys = set(translation_map.keys())

            # Add keys that exist in the database but have no messages
            all_msg_keys = await self.get_all_msg_keys()
            for msg_key in all_msg_keys:
                all_keys.add(msg_key.key_name)

            # Sort keys alphabetically for consistent output
            sorted_keys = sorted(all_keys)

            # Add data rows
            for key in sorted_keys:
                row = [key]  # Start with the key

                # Add translations for each language in the same order as headers
                key_translations = translation_map.get(key, {})
                for lang in all_langs:
                    value = key_translations.get(lang.short_name, "")
                    row.append(value)

                ws.append(row)

            # Auto-adjust column widths
            for column in ws.columns:
                max_length = 0
                column_letter = column[0].column_letter
                for cell in column:
                    try:
                        if len(str(cell.value)) > max_length:
                            max_length = len(str(cell.value))
                    except:
                        pass
                adjusted_width = min(max_length + 2, 50)  # Cap at 50 characters
                ws.column_dimensions[column_letter].width = adjusted_width

            # Save to bytes buffer
            file_stream = io.BytesIO()
            wb.save(file_stream)
            file_stream.seek(0)

            return file_stream.getvalue()

        except Exception as e:
            raise ValueError(f"Error generating Excel file: {str(e)}")

    async def import_from_json(self, file_content: bytes, lang_crud: LangCRUD) -> dict:
        """Import translations from JSON file"""
        import json

        try:
            # Parse JSON content
            json_data = json.loads(file_content.decode("utf-8"))

            if not isinstance(json_data, dict):
                raise ValueError("JSON root must be an object")

            # Get available languages from database
            all_langs = await lang_crud.get_all_langs()
            lang_mapping = {lang.short_name: lang.id for lang in all_langs}

            # Process JSON data
            success_count = 0
            error_count = 0
            errors = []

            for key_name, translations in json_data.items():
                try:
                    if not isinstance(translations, dict):
                        error_count += 1
                        errors.append(
                            f"Key '{key_name}': Translations must be an object"
                        )
                        continue

                    # Skip empty keys
                    if not key_name.strip():
                        error_count += 1
                        errors.append(f"Empty key name")
                        continue

                    # Prepare translations for available languages
                    translation_list = []
                    for lang_short_name, value in translations.items():
                        if lang_short_name in lang_mapping and value:
                            # Only add if value is not empty and language exists
                            if isinstance(value, str) and value.strip():
                                translation_list.append(
                                    {
                                        "lang_id": lang_mapping[lang_short_name],
                                        "value": value.strip(),
                                    }
                                )

                    # Skip if no translations provided
                    if not translation_list:
                        error_count += 1
                        errors.append(
                            f"Key '{key_name}': No valid translations provided"
                        )
                        continue

                    # Check if key exists
                    existing_keys = await self.get_all_msg_keys()
                    existing_key_dict = {key.key_name: key.id for key in existing_keys}

                    if key_name in existing_key_dict:
                        # Update existing key
                        update_data = FullMsgUpdate(
                            key_name=key_name, msg=translation_list
                        )
                        await self.update_full_message(
                            existing_key_dict[key_name], update_data
                        )
                    else:
                        # Create new key
                        create_data = [
                            FullMsgCreate(key_name=key_name, msg=translation_list)
                        ]
                        await self.create_full_message(create_data)

                    success_count += 1

                except Exception as e:
                    error_count += 1
                    errors.append(f"Key '{key_name}': {str(e)}")
                    continue

            return {
                "success_count": success_count,
                "error_count": error_count,
                "total_processed": success_count + error_count,
                "errors": errors if errors else None,
            }

        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON format: {str(e)}")
        except Exception as e:
            raise ValueError(f"Error processing JSON file: {str(e)}")

    async def export_to_json(self, lang_crud: LangCRUD) -> str:
        """Export translations to JSON format with camelCase keys"""
        import json

        # Get all languages ordered by ID
        all_langs = await lang_crud.get_all_langs()
        if not all_langs:
            raise ValueError("No languages found in database")

        # Get all full messages
        full_messages = await self.get_full_messages()

        # Create the translation structure_frontend
        translations_dict = {}

        for message in full_messages:
            # Convert key_name to camelCase
            key_name = self._to_camel_case(message.key_name)

            # Create language translations for this key
            lang_translations = {}

            # Initialize all languages with empty strings
            for lang in all_langs:
                lang_translations[lang.short_name] = ""

            # Fill in existing translations
            for msg in message.msg or []:
                if msg.lang_data:
                    lang_translations[msg.lang_data.short_name] = msg.value

            translations_dict[key_name] = lang_translations

        # Sort dictionary by keys alphabetically
        sorted_translations = dict(sorted(translations_dict.items()))

        # Convert to JSON with proper formatting
        return json.dumps(sorted_translations, ensure_ascii=False, indent=2)

    # async def export_to_json(self, lang_crud: LangCRUD) -> str:
    #     """Export translations to JSON format with camelCase keys"""
    #     import json
    #
    #     # Get all languages ordered by ID
    #     all_langs = await lang_crud.get_all_langs()
    #     if not all_langs:
    #         raise ValueError("No languages found in database")
    #
    #     # Get all full messages
    #     full_messages = await self.get_full_messages()
    #
    #     # Create the translation structure_frontend
    #     translations_dict = {}
    #
    #     for message in full_messages:
    #         # Convert key_name to camelCase
    #         key_name = self._to_camel_case(message.key_name)
    #
    #         # Create language translations for this key
    #         lang_translations = {}
    #
    #         # Initialize all languages with empty strings
    #         for lang in all_langs:
    #             lang_translations[lang.short_name] = ""
    #
    #         # Fill in existing translations
    #         for msg in message.msg or []:
    #             if msg.lang_data:
    #                 lang_translations[msg.lang_data.short_name] = msg.value
    #
    #         translations_dict[key_name] = lang_translations
    #
    #     # Convert to JSON with proper formatting
    #     return json.dumps(translations_dict, ensure_ascii=False, indent=2)

    def _to_camel_case(self, text: str) -> str:
        """Convert text to camelCase, but preserve existing camelCase"""
        if not text:
            return text

        # If it's already camelCase (no spaces/underscores and has uppercase letters), return as-is
        if not any(char in text for char in [" ", "_", "-"]) and any(
            char.isupper() for char in text[1:]
        ):
            return text

        # Split by common separators and convert to camelCase
        words = text.replace("_", " ").replace("-", " ").split()
        if not words:
            return text

        # First word lowercase, subsequent words capitalized
        camel_case = words[0].lower() + "".join(word.capitalize() for word in words[1:])
        return camel_case

    async def get_all_msg_keys(self) -> List[MsgKeyRead]:
        """Get all message keys - SIMPLE format without relationships"""
        stmt = select(MsgKey).order_by(desc(MsgKey.id))
        result = await self.session.execute(stmt)
        msg_keys = result.scalars().all()
        return [
            MsgKeyRead.model_validate({"id": msg_key.id, "key_name": msg_key.key_name})
            for msg_key in msg_keys
        ]

    async def get_msg_key_by_id(self, msg_key_id: int) -> Optional[MsgKeyRead]:
        """Get message key by ID - SIMPLE format"""
        stmt = select(MsgKey).where(MsgKey.id == msg_key_id)
        result = await self.session.execute(stmt)
        msg_key = result.scalar_one_or_none()
        if msg_key:
            return MsgKeyRead.model_validate(
                {"id": msg_key.id, "key_name": msg_key.key_name}
            )
        return None

    async def create_msg_key(self, msg_key_in: MsgKeyCreate) -> MsgKeyRead:
        """Create a new message key"""
        try:
            msg_key = MsgKey(**msg_key_in.model_dump())
            self.session.add(msg_key)
            await self.session.commit()
            await self.session.refresh(msg_key)
            return MsgKeyRead.model_validate(
                {"id": msg_key.id, "key_name": msg_key.key_name}
            )
        except IntegrityError:
            await self.session.rollback()
            raise HTTPException(status_code=209, detail="Message key already exists")

    async def delete_msg_key(self, msg_key_id: int) -> None:
        """Delete a message key"""
        stmt = select(MsgKey).where(MsgKey.id == msg_key_id)
        result = await self.session.execute(stmt)
        msg_key = result.scalar_one_or_none()

        if not msg_key:
            raise ValueError(f"Message key {msg_key_id} not found")

        try:
            await self.session.delete(msg_key)
            await self.session.commit()
        except IntegrityError:
            await self.session.rollback()
            raise HTTPException(
                status_code=400, detail="Cannot delete, used in other records"
            )

    async def get_full_messages(self) -> List[FullMsgRead]:
        """Get full messages in the exact format you specified - WITH relationships"""
        stmt = (
            select(MsgKey)
            .options(selectinload(MsgKey.msg).selectinload(Msg.lang_data))
            .order_by(desc(MsgKey.id))
        )

        result = await self.session.execute(stmt)
        msg_keys = result.scalars().all()

        # Transform to FullMsgRead format matching your example
        full_messages = []
        for msg_key in msg_keys:
            # Create MsgFullMsg list for each message
            msg_list = []
            for msg in msg_key.msg:
                if msg.lang_data:  # Only include if lang_data exists
                    msg_full = MsgFullMsg(
                        value=msg.value,
                        lang_data=LangRead(
                            id=msg.lang_data.id,
                            name=msg.lang_data.name,
                            short_name=msg.lang_data.short_name,
                        ),
                    )
                    msg_list.append(msg_full)

            full_msg = FullMsgRead(
                id=msg_key.id,
                key_name=msg_key.key_name,
                msg=msg_list if msg_list else None,
            )
            full_messages.append(full_msg)

        return full_messages

    async def create_full_message(self, msg_data_in: List[FullMsgCreate]) -> None:
        """Create full messages with separate transactions for Oracle"""
        try:
            for msg_data in msg_data_in:
                # Check if key exists first
                existing_stmt = select(MsgKey).where(
                    MsgKey.key_name == msg_data.key_name
                )
                existing_result = await self.session.execute(existing_stmt)
                existing_key = existing_result.scalar_one_or_none()

                if existing_key:
                    msg_key_id = existing_key.id
                else:
                    # Create key in a separate transaction
                    msg_key = MsgKey(key_name=msg_data.key_name)
                    self.session.add(msg_key)
                    await self.session.flush()  # Commit to get the ID
                    await self.session.refresh(
                        msg_key
                    )  # Refresh to get the Oracle-generated ID
                    msg_key_id = msg_key.id

                    # Begin new transaction for messages
                    # await self.session.begin()

                # Create message entries
                if msg_data.msg:
                    for msg_in in msg_data.msg:
                        msg = Msg(
                            value=msg_in.value,
                            msg_key_id=msg_key_id,
                            lang_id=msg_in.lang_id,
                        )
                        self.session.add(msg)

            await self.session.commit()

        except Exception as e:
            await self.session.rollback()
            raise e

    # async def create_full_message(self, msg_data_in: List[FullMsgCreate]) -> None:
    #     """Create full messages with key and translations"""
    #     for msg_data in msg_data_in:
    #         # Create message key
    #         msg_key = MsgKey(key_name=msg_data.key_name)
    #         self.session.add(msg_key)
    #         await self.session.flush()  # Get the ID without committing
    #
    #         # Create message entries for each language
    #         if msg_data.msg:
    #             for msg_in in msg_data.msg:
    #                 msg = Msg(
    #                     value=msg_in.value,
    #                     msg_key_id=msg_key.id,
    #                     lang_id=msg_in.lang_id,
    #                 )
    #                 self.session.add(msg)
    #
    #     await self.session.commit()

    async def update_full_message(
        self, msg_key_id: int, msg_data_update: FullMsgUpdate
    ) -> FullMsgRead:
        """Update full message with key and translations"""
        # Get existing message key with relationships
        stmt = (
            select(MsgKey)
            .where(MsgKey.id == msg_key_id)
            .options(selectinload(MsgKey.msg).selectinload(Msg.lang_data))
        )
        result = await self.session.execute(stmt)
        msg_key = result.scalar_one_or_none()

        if not msg_key:
            raise ValueError(f"Message key {msg_key_id} not found")

        try:
            # Update message key name if provided
            if msg_data_update.key_name:
                msg_key.key_name = msg_data_update.key_name

            # Update existing messages or create new ones
            if msg_data_update.msg:
                existing_msgs = {msg.lang_id: msg for msg in msg_key.msg}

                for msg_update in msg_data_update.msg:
                    if msg_update.lang_id in existing_msgs:
                        # Update existing message
                        existing_msg = existing_msgs[msg_update.lang_id]
                        if msg_update.value == "":
                            # Delete if value is empty
                            await self.session.delete(existing_msg)
                        else:
                            existing_msg.value = msg_update.value
                    else:
                        # Create new message
                        if msg_update.value:  # Only create if value is not empty
                            new_msg = Msg(
                                value=msg_update.value,
                                msg_key_id=msg_key_id,
                                lang_id=msg_update.lang_id,
                            )
                            self.session.add(new_msg)

            await self.session.commit()

            # Return updated full message
            return await self.get_full_message_by_id(msg_key_id)

        except Exception as e:
            await self.session.rollback()
            raise e

    async def get_full_message_by_id(self, msg_key_id: int) -> FullMsgRead:
        """Get single full message by ID"""
        stmt = (
            select(MsgKey)
            .where(MsgKey.id == msg_key_id)
            .options(selectinload(MsgKey.msg).selectinload(Msg.lang_data))
        )
        result = await self.session.execute(stmt)
        msg_key = result.scalar_one_or_none()

        if not msg_key:
            raise ValueError(f"Message key {msg_key_id} not found")

        # Create MsgFullMsg list
        msg_list = []
        for msg in msg_key.msg:
            if msg.lang_data:  # Only include if lang_data exists
                msg_full = MsgFullMsg(
                    value=msg.value,
                    lang_data=LangRead(
                        id=msg.lang_data.id,
                        name=msg.lang_data.name,
                        short_name=msg.lang_data.short_name,
                    ),
                )
                msg_list.append(msg_full)

        return FullMsgRead(
            id=msg_key.id, key_name=msg_key.key_name, msg=msg_list if msg_list else None
        )


class MsgCRUD:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_all_msgs(self) -> List[MsgRead]:
        """Get all messages - SIMPLE format without relationships"""
        stmt = select(Msg).order_by(desc(Msg.id))
        result = await self.session.execute(stmt)
        msgs = result.scalars().all()
        return [
            MsgRead.model_validate(
                {
                    "id": msg.id,
                    "value": msg.value,
                    "msg_key_id": msg.msg_key_id,
                    "lang_id": msg.lang_id,
                }
            )
            for msg in msgs
        ]

    async def get_msg_by_id(self, msg_id: int) -> Optional[MsgRead]:
        """Get message by ID - SIMPLE format"""
        stmt = select(Msg).where(Msg.id == msg_id)
        result = await self.session.execute(stmt)
        msg = result.scalar_one_or_none()
        if msg:
            return MsgRead.model_validate(
                {
                    "id": msg.id,
                    "value": msg.value,
                    "msg_key_id": msg.msg_key_id,
                    "lang_id": msg.lang_id,
                }
            )
        return None

    async def create_msg(self, msg_in: MsgCreate) -> MsgRead:
        """Create a new message"""
        try:
            msg = Msg(**msg_in.model_dump())
            self.session.add(msg)
            await self.session.commit()
            await self.session.refresh(msg)
            return MsgRead.model_validate(
                {
                    "id": msg.id,
                    "value": msg.value,
                    "msg_key_id": msg.msg_key_id,
                    "lang_id": msg.lang_id,
                }
            )
        except IntegrityError:
            await self.session.rollback()
            raise HTTPException(
                status_code=209,
                detail="Message already exists for this key and language",
            )

    async def delete_msg(self, msg_id: int) -> None:
        """Delete a message"""
        stmt = select(Msg).where(Msg.id == msg_id)
        result = await self.session.execute(stmt)
        msg = result.scalar_one_or_none()

        if not msg:
            raise ValueError(f"Message {msg_id} not found")

        await self.session.delete(msg)
        await self.session.commit()


# Factory functions for dependency injection
async def get_lang_crud(
    session: AsyncSession = Depends(db_helper.session_getter),
) -> LangCRUD:
    return LangCRUD(session)


async def get_msg_key_crud(
    session: AsyncSession = Depends(db_helper.session_getter),
) -> MsgKeyCRUD:
    return MsgKeyCRUD(session)


async def get_msg_crud(
    session: AsyncSession = Depends(db_helper.session_getter),
) -> MsgCRUD:
    return MsgCRUD(session)
