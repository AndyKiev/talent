from fastapi import APIRouter, Depends, status, Query
from fastapi.security import HTTPBearer
from typing import Annotated, Optional, List

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.user_group_type.user_group_type_schema import (
    UserGroupType as UserGroupTypeSchema,
    UserGroupTypeCreate,
    UserGroupTypeUpdate,
)
from backend.api_v1.user_group_type.user_group_type_dependencies import (
    get_user_group_type_service,
    user_group_type_by_id,
)
from backend.api_v1.user_group_type.user_group_type_service import UserGroupTypeService
from backend.auth.guards import Guard
from backend.utils.enums import OperationVerb, EssenceName

router = APIRouter(
    prefix="/admin/user_group_types",
    tags=["User Group Types"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get(
    "",
    response_model=List[UserGroupTypeSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.USER_GROUP_TYPE)],
)
async def get_user_group_types(
    service: Annotated[UserGroupTypeService, Depends(get_user_group_type_service)],
    name: Optional[str] = None,
    sort: Optional[str] = Query(
        None,
        description='JSON for sorting: {"field": "asc|desc"} or [{"field1": "asc"}, "field2"]',
    ),
):
    return await service.get_user_group_types(name=name, sort=sort)


@router.get(
    "/{user_group_type_id}",
    response_model=UserGroupTypeSchema,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.USER_GROUP_TYPE)],
)
async def get_user_group_type(
    record: UserGroupTypeSchema = Depends(user_group_type_by_id),
):
    return record


@router.post(
    "",
    response_model=MutationResponse[UserGroupTypeSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.CREATE, EssenceName.USER_GROUP_TYPE)],
)
async def create_user_group_type(
    type_in: UserGroupTypeCreate,
    service: Annotated[UserGroupTypeService, Depends(get_user_group_type_service)],
):
    return await service.create_user_group_type(type_in)


@router.patch(
    "/{user_group_type_id}",
    response_model=MutationResponse[UserGroupTypeSchema],
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.USER_GROUP_TYPE)],
)
async def update_user_group_type(
    type_update: UserGroupTypeUpdate,
    record: UserGroupTypeSchema = Depends(user_group_type_by_id),
    service: Annotated[
        UserGroupTypeService, Depends(get_user_group_type_service)
    ] = None,
):
    return await service.update_user_group_type(record.id, type_update)


@router.delete(
    "/{user_group_type_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.DELETE, EssenceName.USER_GROUP_TYPE)],
)
async def delete_user_group_type(
    user_group_type_id: int,
    service: Annotated[UserGroupTypeService, Depends(get_user_group_type_service)],
):
    await service.delete_user_group_type(user_group_type_id)
