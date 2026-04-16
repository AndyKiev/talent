# backend/api_v1/dependencies/message_model.py
from fastapi import Depends, HTTPException, status
from typing import Annotated

from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.message.message_crud import (
    get_lang_crud,
    get_msg_key_crud,
    get_msg_crud,
)
from backend.api_v1.message.message_crud import LangCRUD, MsgKeyCRUD, MsgCRUD
from backend.database import db_helper


async def lang_by_id(
    lang_id: int,
    crud: LangCRUD = Depends(get_lang_crud),
) -> dict:
    """Dependency to get language by ID"""
    lang = await crud.get_lang_by_id(lang_id)
    if not lang:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Language with ID {lang_id} not found",
        )
    return lang


async def msg_key_by_id(
    msg_key_id: int,
    crud: MsgKeyCRUD = Depends(get_msg_key_crud),
) -> dict:
    """Dependency to get message key by ID"""
    msg_key = await crud.get_msg_key_by_id(msg_key_id)
    if not msg_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Message key with ID {msg_key_id} not found",
        )
    return msg_key


async def msg_by_id(
    msg_id: int,
    crud: MsgCRUD = Depends(get_msg_crud),
) -> dict:
    """Dependency to get message by ID"""
    msg = await crud.get_msg_by_id(msg_id)
    if not msg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Message with ID {msg_id} not found",
        )
    return msg
