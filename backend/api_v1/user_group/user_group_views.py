from fastapi import APIRouter, Depends, status, Query
from typing import List, Optional, Annotated

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.user_group.user_group_service import UserGroupService
from backend.api_v1.user_group.user_group_schema import (
    UserGroup as UserGroupSchema,
    UserGroupCreate,
    UserGroupUpdate,
)
from backend.api_v1.user_group.user_group_dependencies import get_user_group_service
from backend.auth.guards import Guard
from backend.utils.enums import OperationVerb, EssenceName

router = APIRouter(prefix="/admin/user_groups", tags=["User Groups"])


async def user_group_by_id(
    user_group_id: int,
    service: UserGroupService = Depends(get_user_group_service),
) -> UserGroupSchema:
    return await service.get_user_group_by_id(user_group_id)


async def user_group_by_name(
    name: str,
    service: UserGroupService = Depends(get_user_group_service),
) -> UserGroupSchema:
    user_group = await service.get_user_group_by_name(name)
    if not user_group:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User group with name '{name}' not found",
        )
    return user_group


@router.get(
    "",
    response_model=List[UserGroupSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.USER_GROUP)],
)
async def get_user_groups(
    service: UserGroupService = Depends(get_user_group_service),
    user_group_type_id: Optional[int] = Query(
        None, description="Filter groups by employee group type ID"
    ),
):
    return await service.get_user_groups(user_group_type_id=user_group_type_id)


@router.get(
    "/{user_group_id}",
    response_model=UserGroupSchema,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.USER_GROUP)],
)
async def get_user_group_by_id(
    user_group: UserGroupSchema = Depends(user_group_by_id),
):
    return user_group


@router.get(
    "/by_name/{name}",
    response_model=UserGroupSchema,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.USER_GROUP)],
)
async def get_user_group_by_name(
    user_group: UserGroupSchema = Depends(user_group_by_name),
):
    return user_group


@router.post(
    "",
    response_model=MutationResponse[UserGroupSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.CREATE, EssenceName.USER_GROUP)],
)
async def create_user_group(
    user_group_in: UserGroupCreate,
    service: UserGroupService = Depends(get_user_group_service),
):
    return await service.create_user_group(user_group_in)


@router.patch(
    "/{user_group_id}",
    response_model=MutationResponse[UserGroupSchema],
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.USER_GROUP)],
)
async def update_user_group_partial(
    user_group_update: UserGroupUpdate,
    user_group: UserGroupSchema = Depends(user_group_by_id),
    service: UserGroupService = Depends(get_user_group_service),
):
    return await service.update_user_group(
        user_group.id, user_group_update, partial=True
    )


@router.delete(
    "/{user_group_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Guard(OperationVerb.DELETE, EssenceName.USER_GROUP)],
)
async def delete_user_group(
    user_group: UserGroupSchema = Depends(user_group_by_id),
    service: UserGroupService = Depends(get_user_group_service),
) -> None:
    await service.delete_user_group(user_group.id)
