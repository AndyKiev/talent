# backend/api_v1/essence/essence_views.py
from fastapi import APIRouter, Depends, status
from fastapi.security import HTTPBearer
from typing import Annotated, List, Optional

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.essence.essence_schema import EssenceSchema, EssenceCreate, EssenceUpdate
from backend.api_v1.essence.essence_dependencies import get_essence_service, essence_by_id
from backend.api_v1.essence.essence_service import EssenceService
from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.auth.jwt_auth import has_access
from backend.utils.enums import OperationVerb, EssenceName

router = APIRouter(
    prefix="/admin/essences",
    tags=["Essences"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get("", response_model=List[EssenceSchema])
async def get_essences(
    service: Annotated[EssenceService, Depends(get_essence_service)],
    name: Optional[str] = None,
    # _auth_user: Annotated[
    #     UserSchema,
    #     Depends(has_access(OperationVerb.VIEW, EssenceName.ESSENCE)),
    # ] = None,
):
    return await service.get_all(name=name)


@router.get("/{essence_id}", response_model=EssenceSchema)
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


@router.patch("/{essence_id}", response_model=MutationResponse[EssenceSchema])
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


@router.delete("/{essence_id}", status_code=status.HTTP_200_OK)
async def delete_essence(
    essence_id: int,
    service: Annotated[EssenceService, Depends(get_essence_service)],
    # _auth_user: Annotated[
    #     UserSchema,
    #     Depends(has_access(OperationVerb.DELETE, EssenceName.ESSENCE)),
    # ] = None,
):
    await service.delete(essence_id)
