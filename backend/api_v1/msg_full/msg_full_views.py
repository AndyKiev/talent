import io
from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from starlette.responses import StreamingResponse

from backend.api_v1.msg_full.msg_full_dependencies import get_msg_full_service
from backend.api_v1.msg_full.msg_full_schema import FullMsgCreate, FullMsgUpdate, FullMsgRead
from backend.api_v1.msg_full.msg_full_service import MsgFullService

router = APIRouter(prefix="/full_msgs", tags=["Full Messages"])


@router.get("", response_model=List[FullMsgRead])
async def get_full_messages(
    service: Annotated[MsgFullService, Depends(get_msg_full_service)],
):
    return await service.get_full_messages()


@router.get("/{msg_key_id}", response_model=FullMsgRead)
async def get_full_message(
    msg_key_id: int,
    service: Annotated[MsgFullService, Depends(get_msg_full_service)],
):
    return await service.get_full_message_by_id(msg_key_id)


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_full_messages(
    data_in: List[FullMsgCreate],
    service: Annotated[MsgFullService, Depends(get_msg_full_service)],
):
    await service.create_full_messages(data_in)
    raise HTTPException(status_code=status.HTTP_201_CREATED, detail=f"Created {len(data_in)} message key(s)")


@router.patch("/{msg_key_id}", response_model=FullMsgRead)
async def update_full_message(
    msg_key_id: int,
    data_update: FullMsgUpdate,
    service: Annotated[MsgFullService, Depends(get_msg_full_service)],
):
    return await service.update_full_message(msg_key_id, data_update)


# @router.delete("/{msg_key_id}", status_code=status.HTTP_200_OK)
# async def delete_full_message(
#     msg_key_id: int,
#     service: Annotated[MsgFullService, Depends(get_msg_full_service)],
# ):
#     """
#     Deletes the MsgKey and all its child Msgs (cascade handled by the DB/ORM).
#     Delegates to the existing msg_key service via get_by_id + delete.
#     """
#     from backend.api_v1.msg_key.msg_key_dependencies import get_msg_key_service
#     # NOTE: delete is intentionally kept in msg_key since MsgKey is the owner.
#     # Wire this in main_router.py alongside msg_key's router if you prefer
#     # a single delete endpoint there. This stub keeps the full_msg router self-contained.
#     raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Use DELETE /msg_keys/{id}")

@router.delete("/{msg_key_id}", status_code=status.HTTP_200_OK)
async def delete_full_message(
    msg_key_id: int,
    service: Annotated[MsgFullService, Depends(get_msg_full_service)],
):
    await service.delete_full_message(msg_key_id)
    return {"message": f"Message key {msg_key_id} deleted"}


@router.post("/import_json", status_code=status.HTTP_200_OK)
async def import_json(
    file: UploadFile = File(...),
    service: MsgFullService = Depends(get_msg_full_service),
):
    if not file.filename.endswith(".json"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File must be .json")
    contents = await file.read()
    result = await service.import_from_json(contents)
    return {"message": "JSON imported", **result}


@router.get("/export_json", status_code=status.HTTP_200_OK)
async def export_json(
    filename: str = "translations.json",
    service: MsgFullService = Depends(get_msg_full_service),
):
    content = await service.export_to_json()
    return StreamingResponse(
        io.BytesIO(content.encode("utf-8")),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )