import io
from fastapi import APIRouter, Depends, status, HTTPException, Request, UploadFile, File
from typing import List, Annotated

from sqlalchemy.exc import IntegrityError
from starlette.responses import StreamingResponse

from backend.api_v1.message.message_model import MsgKey
from backend.api_v1.user.user_model import User

from backend.auth.auth_dependencies import current_user_by_token

from backend.api_v1.message.message_crud import (
    LangCRUD,
    MsgKeyCRUD,
    MsgCRUD,
    get_lang_crud,
    get_msg_key_crud,
    get_msg_crud,
)
from backend.api_v1.message.message_dependencies import (
    lang_by_id,
    msg_key_by_id,
    msg_by_id,
)
from backend.api_v1.message.message_schema import (
    MsgKeyRead,
    MsgKeyCreate,
    MsgRead,
    MsgCreate,
    FullMsgCreate,
    FullMsgUpdate,
    FullMsgRead,
)

from backend.api_v1.lang.lang_schema import (
    LangRead,
    LangCreate,
)

from backend.auth.jwt_auth import get_current_active_auth_user

from backend.api_v1.user.user_schema import User as UserSchema
from backend.api_v1.message.message_service import MsgKeyService
from backend.api_v1.message.message_key_dependencies import (
    get_msg_key_service,
    get_msg_key_by_id,
)
from backend.config.config import settings

router = APIRouter(prefix="/settings", tags=["Settings"])

# Reusable dependency for current user
CurrentUser = Annotated[UserSchema, Depends(get_current_active_auth_user)]


# Language endpoints
@router.get(
    "/langs",
    response_model=List[LangRead],
    responses={204: {"description": "No languages found"}},
)
async def get_all_langs(
    request: Request,
    # current_user: CurrentUser,
    crud: LangCRUD = Depends(get_lang_crud),
):
    """Get all languages"""
    langs = await crud.get_all_langs()

    if langs:
        return langs

    raise HTTPException(
        status_code=status.HTTP_204_NO_CONTENT,
        detail="No languages found",
    )


@router.post(
    "/langs",
    response_model=LangRead,
    status_code=status.HTTP_201_CREATED,
    responses={209: {"description": "Language already exists"}},
)
async def create_lang(
    request: Request,
    lang_in: LangCreate,
    current_user: CurrentUser,
    crud: LangCRUD = Depends(get_lang_crud),
):
    """Create a new language"""
    return await crud.create_lang(lang_in)


@router.delete(
    "/langs/{lang_id}",
    responses={200: {"description": "Language successfully deleted"}},
)
async def delete_lang(
    request: Request,
    current_user: CurrentUser,
    lang: dict = Depends(lang_by_id),
    crud: LangCRUD = Depends(get_lang_crud),
):
    """Delete a language"""
    await crud.delete_lang(lang.id)
    raise HTTPException(
        status_code=status.HTTP_200_OK,
        detail="Language successfully deleted",
    )


@router.get(
    "/msg_keys",
    response_model=list[MsgKeyRead],
    responses={204: {"description": "message key does not exist"}},
)
# @require_groups(["admin", "pricing_team", "vtm_team", "vtm_assist", "quality_team"])
async def get_all_msg_keys(
    request: Request,
    msg_key_service: Annotated[MsgKeyService, Depends(get_msg_key_service)],
    # user: Annotated[User, None] = Depends(current_user_by_token),
):
    # logger.info(f"ℹ️ Користувач {user.user_ukr}")
    msg_keys = await msg_key_service.get_all()

    if msg_keys:
        return msg_keys

    raise HTTPException(
        status_code=status.HTTP_204_NO_CONTENT,
        description= "message key does not exist",
    )



@router.post(
    "/msg_keys",
    response_model=MsgKeyRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_msg_key(
    request: Request,
    msg_key_in: MsgKeyCreate,
    msg_key_service: Annotated[MsgKeyService, Depends(get_msg_key_service)],
):

    return await msg_key_service.create(model=msg_key_in)



@router.delete(
    "/msg_keys",
    responses={200: {"description": "message key successfully deleted"}},
)
# @require_groups(["admin", "pricing_team", "vtm_team", "vtm_assist", "quality_team"])
async def delete_msg_key(
    request: Request,
    msg_key: Annotated[
        MsgKey,
        Depends(get_msg_key_by_id),
    ],
    msg_key_service: Annotated[MsgKeyService, Depends(get_msg_key_service)],
    user: Annotated[User, None] = Depends(current_user_by_token),
):
    try:
        # logger.info(f"ℹ️ Користувач {user.user_ukr}, обєкт {get_info(msg_key)}")
        await msg_key_service.delete(model=msg_key)
        raise HTTPException(
            status_code=status.HTTP_200_OK,
            detail="eletion successfull",
        )
    except IntegrityError as e:
        # logger.error(f"❌ Помилка запиту: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to delete used in other records",
        )


# @router.delete(
#     "/msg_keys/{msg_key_id}",
#     responses={200: {"description": "Message key successfully deleted"}},
# )
# async def delete_msg_key(
#     request: Request,
#     # current_user: CurrentUser,
#     msg_key: dict = Depends(msg_key_by_id),
#     crud: MsgKeyCRUD = Depends(get_msg_key_crud),
# ):
#     """Delete a message key"""
#     await crud.delete_msg_key(msg_key.id)
#     raise HTTPException(
#         status_code=status.HTTP_200_OK,
#         detail="Message key successfully deleted",
#     )


# Message endpoints
@router.get(
    "/msg",
    response_model=List[MsgRead],
    responses={204: {"description": "No messages found"}},
)
async def get_all_msgs(
    request: Request,
    # current_user: CurrentUser,
    crud: MsgCRUD = Depends(get_msg_crud),
):
    """Get all messages"""
    msgs = await crud.get_all_msgs()

    if msgs:
        return msgs

    raise HTTPException(
        status_code=status.HTTP_204_NO_CONTENT,
        detail="No messages found",
    )


@router.post(
    "/msg",
    response_model=MsgRead,
    status_code=status.HTTP_201_CREATED,
    responses={
        209: {"description": "Message already exists for this key and language"}
    },
)
async def create_msg(
    request: Request,
    msg_in: MsgCreate,
    # current_user: CurrentUser,
    crud: MsgCRUD = Depends(get_msg_crud),
):
    """Create a new message"""
    return await crud.create_msg(msg_in)


@router.delete(
    "/msg/{msg_id}",
    responses={200: {"description": "Message successfully deleted"}},
)
async def delete_msg(
    request: Request,
    # current_user: CurrentUser,
    msg: dict = Depends(msg_by_id),
    crud: MsgCRUD = Depends(get_msg_crud),
):
    """Delete a message"""
    await crud.delete_msg(msg.id)
    raise HTTPException(
        status_code=status.HTTP_200_OK,
        detail="Message successfully deleted",
    )


@router.get(
    "/full_msg",
    response_model=list[FullMsgRead],
    responses={204: {"description":"message does not exist"}},
)
# @require_groups(["admin", "pricing_team", "vtm_team", "vtm_assist", "quality_team"])
async def get_full_msg(
    # request: Request,
    msg_service: Annotated[MsgKeyService, Depends(get_msg_key_service)],
    # user: Annotated[User, None] = Depends(current_user_by_token),
):
    # logger.info(f"ℹ️ Користувач {user.user_ukr}")
    msg = await msg_service.get_sort_all()

    if msg:
        return msg

    raise HTTPException(
        status_code=status.HTTP_204_NO_CONTENT,
        detail="message does not exist",
    )


@router.post(
    "/full_msg",
    status_code=status.HTTP_201_CREATED,
    responses={209: {"description": "Creation conflict"}},
)
async def create_full_msg(
    # request: Request,
    msg_data_in: List[FullMsgCreate],
    # current_user: CurrentUser,
    crud: MsgKeyCRUD = Depends(get_msg_key_crud),
):
    """Create full messages"""
    await crud.create_full_message(msg_data_in)
    raise HTTPException(
        status_code=status.HTTP_200_OK,
        detail=f"Successfully added {len(msg_data_in)} full messages",
    )


@router.patch(
    "/full_msg/{msg_key_id}",
    responses={209: {"description": "Update conflict"}},
)
async def update_full_msg(
    request: Request,
    msg_data_update: FullMsgUpdate,
    # current_user: CurrentUser,
    msg_key: dict = Depends(msg_key_by_id),
    crud: MsgKeyCRUD = Depends(get_msg_key_crud),
):
    """Update full message"""
    try:
        result = await crud.update_full_message(msg_key.id, msg_data_update)
        return result
    except Exception as e:
        raise HTTPException(status_code=209, detail=f"Update conflict: {str(e)}")


@router.delete(
    "/full_msg/{msg_key_id}",
    responses={200: {"description": "Full message successfully deleted"}},
)
async def delete_full_msg(
    request: Request,
    # current_user: CurrentUser,
    msg_key: dict = Depends(msg_key_by_id),
    crud: MsgKeyCRUD = Depends(get_msg_key_crud),
):
    """Delete full message"""
    try:
        await crud.delete_msg_key(msg_key.id)
        raise HTTPException(
            status_code=status.HTTP_200_OK,
            detail="Full message successfully deleted",
        )
    except HTTPException as e:
        # This will catch the IntegrityError from delete_msg_key
        raise e


@router.post(
    "/upload_excel",
    responses={
        200: {"description": "Excel file processed successfully"},
        400: {"description": "Invalid file format or data"},
    },
)
async def upload_excel_file(
    request: Request,
    file: UploadFile = File(...),
    lang_crud: LangCRUD = Depends(get_lang_crud),
    msg_key_crud: MsgKeyCRUD = Depends(get_msg_key_crud),
):
    """Upload Excel file and import translations"""

    # Validate file type
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an Excel file (.xlsx or .xls)",
        )

    try:
        # Read file content
        contents = await file.read()

        # Delegate processing to CRUD layer
        result = await msg_key_crud.import_from_excel(contents, lang_crud)

        return {"message": "Excel file processed successfully", **result}

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error processing file: {str(e)}",
        )


@router.get(
    "/download_excel",
    responses={
        200: {
            "description": "Excel file with translations",
            "content": {
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
                    "schema": {"type": "string", "format": "binary"}
                }
            },
        },
        204: {"description": "No data available for export"},
    },
)
async def download_excel_file(
    request: Request,
    filename: str = "translations_export.xlsx",
    lang_crud: LangCRUD = Depends(get_lang_crud),
    msg_key_crud: MsgKeyCRUD = Depends(get_msg_key_crud),
):
    """Download translations as Excel file"""
    try:
        # Delegate Excel generation to CRUD layer
        file_content = await msg_key_crud.export_to_excel(lang_crud)

        # Return file response
        return StreamingResponse(
            io.BytesIO(file_content),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )

    except ValueError as e:
        if "No languages found" in str(e):
            raise HTTPException(status_code=status.HTTP_204_NO_CONTENT, detail=str(e))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating Excel file: {str(e)}",
        )


@router.get(
    "/download_json",
    responses={
        200: {
            "description": "JSON file with translations",
            "content": {
                "application/json": {"schema": {"type": "string", "format": "binary"}}
            },
        },
        204: {"description": "No data available for export"},
    },
)
async def download_json_file(
    request: Request,
    filename: str = "translations_export.json",
    lang_crud: LangCRUD = Depends(get_lang_crud),
    msg_key_crud: MsgKeyCRUD = Depends(get_msg_key_crud),
):
    """Download translations as JSON file"""
    try:
        # Delegate JSON generation to CRUD layer
        json_content = await msg_key_crud.export_to_json(lang_crud)
        # Return file response
        return StreamingResponse(
            io.BytesIO(json_content.encode("utf-8")),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )

    except ValueError as e:
        if "No languages found" in str(e):
            raise HTTPException(status_code=status.HTTP_204_NO_CONTENT, detail=str(e))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating JSON file: {str(e)}",
        )


@router.post(
    "/upload_json",
    responses={
        200: {"description": "JSON file processed successfully"},
        400: {"description": "Invalid file format or data"},
    },
)
async def upload_json_file(
    request: Request,
    file: UploadFile = File(...),
    lang_crud: LangCRUD = Depends(get_lang_crud),
    msg_key_crud: MsgKeyCRUD = Depends(get_msg_key_crud),
):
    """Upload JSON file and import translations"""

    # Validate file type
    if not file.filename.endswith(".json"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a JSON file (.json)",
        )

    try:
        # Read file content
        contents = await file.read()

        # Delegate processing to CRUD layer
        result = await msg_key_crud.import_from_json(contents, lang_crud)

        return {"message": "JSON file processed successfully", **result}

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error processing file: {str(e)}",
        )
