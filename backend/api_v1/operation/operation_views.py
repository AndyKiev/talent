from typing import Annotated

from fastapi import APIRouter, Depends, status
from fastapi.security import HTTPBearer
from pydantic import BaseModel

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.api_v1.operation.operation_dependency import (
    get_operation_service,
    operation_by_id,
)
from backend.api_v1.operation.operation_schema import (
    Operation as OperationSchema,
)
from backend.api_v1.operation.operation_schema import (
    OperationCreate,
    OperationUpdate,
)
from backend.api_v1.operation.operation_service import OperationService
from backend.auth.guards import Guard
from backend.auth.jwt_auth import require_operation
from backend.utils.enums import EssenceName, OperationTypes, OperationVerb

router = APIRouter(
    prefix="/operations",
    tags=["Operations"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get(
    "",
    response_model=list[OperationSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.OPERATION)],
)
async def get_operations(
    service: Annotated[OperationService, Depends(get_operation_service)],
    name: str | None = None,
):
    return await service.get_operations(name=name)


@router.get(
    "/{operation_id}",
    response_model=OperationSchema,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.OPERATION)],
)
async def get_operation(operation: OperationSchema = Depends(operation_by_id)):
    return operation


@router.post(
    "",
    response_model=MutationResponse[OperationSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.CREATE, EssenceName.OPERATION)],
)
async def create_operation(
    operation_in: OperationCreate,
    service: Annotated[OperationService, Depends(get_operation_service)],
    _auth_user: Annotated[
        UserSchema,
        Depends(require_operation(OperationTypes.CREATE_OPERATION)),
    ] = None,
):
    return await service.create_operation(operation_in)


@router.patch(
    "/{operation_id}",
    response_model=MutationResponse[OperationSchema],
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.OPERATION)],
)
async def update_operation(
    operation_update: OperationUpdate,
    operation: OperationSchema = Depends(operation_by_id),
    service: Annotated[OperationService, Depends(get_operation_service)] = None,
    _auth_user: Annotated[
        UserSchema,
        Depends(require_operation(OperationTypes.MODIFY_OPERATION)),
    ] = None,
):
    return await service.update_operation(operation.id, operation_update)


@router.delete(
    "/{operation_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.DELETE, EssenceName.OPERATION)],
)
async def delete_operation(
    operation_id: int,
    service: Annotated[OperationService, Depends(get_operation_service)],
    _auth_user: Annotated[
        UserSchema,
        Depends(require_operation(OperationTypes.DELETE_OPERATION)),
    ] = None,
):
    await service.delete_operation(operation_id)


@router.get(
    "/{operation_id}/user_groups",
    response_model=list[str],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.OPERATION)],
)
async def get_operation_user_groups(
    operation: OperationSchema = Depends(operation_by_id),
):
    return operation.user_groups


class OperationUserGroupsUpdate(BaseModel):
    user_group_ids: list[int]


@router.post(
    "/{operation_id}/user_groups/{user_group_id}",
    response_model=OperationSchema,
    dependencies=[
        Guard(OperationVerb.LINK, EssenceName.OPERATION, EssenceName.USER_GROUP)
    ],
)
async def add_operation_to_user_group(
    user_group_id: int,
    operation: Annotated[OperationSchema, Depends(operation_by_id)],
    service: Annotated[OperationService, Depends(get_operation_service)],
    _auth_user: Annotated[
        UserSchema,
        Depends(require_operation(OperationTypes.LINK_USER_GROUP_TO_OPERATION)),
    ] = None,
):
    return await service.add_to_group(operation.id, user_group_id)


@router.delete(
    "/{operation_id}/user_groups/{user_group_id}",
    response_model=OperationSchema,
    dependencies=[
        Guard(OperationVerb.LINK, EssenceName.OPERATION, EssenceName.USER_GROUP)
    ],
)
async def remove_operation_from_user_group(
    user_group_id: int,
    operation: Annotated[OperationSchema, Depends(operation_by_id)],
    service: Annotated[OperationService, Depends(get_operation_service)],
    _auth_user: Annotated[
        UserSchema,
        Depends(require_operation(OperationTypes.REMOVE_OPERATION_FROM_USER_GROUP)),
    ] = None,
):
    return await service.remove_from_group(operation.id, user_group_id)


@router.put(
    "/{operation_id}/user_groups",
    response_model=OperationSchema,
    dependencies=[
        Guard(OperationVerb.LINK, EssenceName.OPERATION, EssenceName.USER_GROUP)
    ],
)
async def set_operation_user_groups(
    groups_update: OperationUserGroupsUpdate,
    operation: OperationSchema = Depends(operation_by_id),
    service: OperationService = Depends(get_operation_service),
    _auth_user: Annotated[
        UserSchema,
        Depends(require_operation(OperationTypes.SET_OPERATION_USER_GROUPS)),
    ] = None,
):
    return await service.set_groups(operation.id, groups_update.user_group_ids)
