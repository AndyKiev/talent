# backend/api_v1/essence/essence_views.py
from typing import Annotated

from fastapi import APIRouter, Depends, status
from fastapi.security import HTTPBearer

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.essence.essence_dependencies import (
    essence_by_id,
    get_essence_service,
)
from backend.api_v1.essence.essence_schema import (
    EssenceCreate,
    EssenceSchema,
    EssenceUpdate,
)
from backend.api_v1.essence.essence_service import EssenceService
from backend.auth.guards import Guard
from backend.utils.enums import EssenceName, OperationVerb

router = APIRouter(
    prefix="/admin/essences",
    tags=["Essences"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get(
    "",
    response_model=list[EssenceSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.ESSENCE)],
)
async def get_essences(
    service: Annotated[EssenceService, Depends(get_essence_service)],
    name: str | None = None,
    # _auth_user: Annotated[
    #     UserSchema,
    #     Depends(has_access(OperationVerb.VIEW, EssenceName.ESSENCE)),
    # ] = None,
):
    return await service.get_all(name=name)


@router.get(
    "/{essence_id}",
    response_model=EssenceSchema,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.ESSENCE)],
)
async def get_essence(
    essence: Annotated[EssenceSchema, Depends(essence_by_id)],
    # _auth_user: Annotated[
    #     UserSchema,
    #     Depends(has_access(OperationVerb.VIEW, EssenceName.ESSENCE)),
    # ] = None,
):
    return essence


@router.post(
    "",
    response_model=MutationResponse[EssenceSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.CREATE, EssenceName.ESSENCE)],
)
async def create_essence(
    essence_in: EssenceCreate,
    service: Annotated[EssenceService, Depends(get_essence_service)],
    # _auth_user: Annotated[
    #     UserSchema,
    #     Depends(has_access(OperationVerb.CREATE, EssenceName.ESSENCE)),
    # ] = None,
):
    return await service.create(essence_in)


@router.patch(
    "/{essence_id}",
    response_model=MutationResponse[EssenceSchema],
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.ESSENCE)],
)
async def update_essence(
    essence_update: EssenceUpdate,
    essence: Annotated[EssenceSchema, Depends(essence_by_id)],
    service: Annotated[EssenceService, Depends(get_essence_service)] = None,
    # _auth_user: Annotated[
    #     UserSchema,
    #     Depends(has_access(OperationVerb.MODIFY, EssenceName.ESSENCE)),
    # ] = None,
):
    return await service.update(essence.id, essence_update)


@router.delete(
    "/{essence_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.DELETE, EssenceName.ESSENCE)],
)
async def delete_essence(
    essence_id: int,
    service: Annotated[EssenceService, Depends(get_essence_service)],
    # _auth_user: Annotated[
    #     UserSchema,
    #     Depends(has_access(OperationVerb.DELETE, EssenceName.ESSENCE)),
    # ] = None,
):
    await service.delete(essence_id)
