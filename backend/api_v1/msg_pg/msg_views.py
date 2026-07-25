from typing import Annotated

from fastapi import APIRouter, Depends, status

from backend.api_v1.msg_pg.msg_dependencies import get_msg_service, msg_by_id
from backend.api_v1.msg_pg.msg_model import Msg as MsgModel
from backend.api_v1.msg_pg.msg_schema import Msg as MsgSchema
from backend.api_v1.msg_pg.msg_schema import MsgCreate, MsgUpdate
from backend.api_v1.msg_pg.msg_service import MsgService
from backend.auth.guards import Guard
from backend.utils.enums import EssenceName, OperationVerb

router = APIRouter(
    prefix="/msgs",
    tags=["Messages"],
)


@router.get("", response_model=list[MsgSchema])
async def get_msgs(
    service: Annotated[MsgService, Depends(get_msg_service)],
):
    msgs = await service.get_all()
    return [MsgSchema.model_validate(m) for m in msgs]


@router.get("/{msg_id}", response_model=MsgSchema)
async def get_msg(msg: MsgSchema = Depends(msg_by_id)):
    return msg


@router.post(
    "",
    response_model=MsgSchema,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.CREATE, EssenceName.MSG)],
)
async def create_msg(
    msg_in: MsgCreate,
    service: Annotated[MsgService, Depends(get_msg_service)],
):
    return await service.create(msg_in)


@router.patch(
    "/{msg_id}",
    response_model=MsgSchema,
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.MSG)],
)
async def update_msg(
    msg_update: MsgUpdate,
    msg: MsgModel = Depends(msg_by_id),
    service: Annotated[MsgService, Depends(get_msg_service)] = None,
):
    return await service.update(msg, msg_update)


@router.delete(
    "/{msg_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.DELETE, EssenceName.MSG)],
)
async def delete_msg(
    service: Annotated[MsgService, Depends(get_msg_service)],
    msg: MsgModel = Depends(msg_by_id),
):
    await service.delete(msg)
