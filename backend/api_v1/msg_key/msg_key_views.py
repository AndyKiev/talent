from fastapi import APIRouter, Depends, status

# from fastapi import APIRouter, Depends, status, Query
# from fastapi.security import HTTPBearer
from typing import Annotated, Optional, List

# from pydantic import BaseModel
from backend.api_v1.msg_key.msg_key_model import MsgKey as MsgKeyModel
from backend.api_v1.base.errors import NotFoundError
from backend.api_v1.msg_key.msg_key_dependencies import (
    get_msg_key_service,
    msg_key_by_id,
)
from backend.api_v1.msg_key.msg_key_schema import (
    MsgKey as MsgKeySchema,
    MsgKeyCreate,
    MsgKeyUpdate,
)
from backend.api_v1.msg_key.msg_key_service import MsgKeyService
from backend.auth.guards import Guard
from backend.utils.enums import OperationVerb, EssenceName


router = APIRouter(
    prefix="/msg_keys",
    tags=["Message Keys"],
    # dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get("", response_model=List[MsgKeySchema])
async def get_msg_keys(
    service: Annotated[MsgKeyService, Depends(get_msg_key_service)],
    name: Optional[str] = None,
):
    if name:
        msg_key = await service.get_by_name(name, not_found_exc=NotFoundError)
        return [MsgKeySchema.model_validate(msg_key)]
    msg_keys = await service.get_all()
    return [MsgKeySchema.model_validate(msk) for msk in msg_keys]


#
@router.get("/{msg_key_id}", response_model=MsgKeySchema)
async def get_msg_key(job: MsgKeySchema = Depends(msg_key_by_id)):
    return job


@router.post(
    "",
    response_model=MsgKeySchema,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.CREATE, EssenceName.MSG_KEY)],
)
async def create_msg_key(
    msg_key_in: MsgKeyCreate,
    service: Annotated[MsgKeyService, Depends(get_msg_key_service)],
):
    return await service.create(msg_key_in)


@router.patch(
    "/{msg_key_id}",
    response_model=MsgKeySchema,
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.MSG_KEY)],
)
async def update_msg_key(
    msg_key_update: MsgKeyUpdate,
    msg_key: MsgKeyModel = Depends(msg_key_by_id),  # ← LangModel not LangSchema
    service: Annotated[MsgKeyService, Depends(get_msg_key_service)] = None,
):
    return await service.update(msg_key, msg_key_update)


@router.delete(
    "/{msg_key_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.DELETE, EssenceName.MSG_KEY)],
)
async def delete_msg_key(
    service: Annotated[MsgKeyService, Depends(get_msg_key_service)],
    msg_key: MsgKeyModel = Depends(msg_key_by_id),  # ← LangModel not LangSchema
):
    await service.delete(msg_key)
