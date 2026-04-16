from fastapi import APIRouter, Depends, status, HTTPException, Query
from typing import List, Optional
from backend.auth.jwt_auth import require_operation
from backend.api_v1.user_group.user_group_service import UserGroupService
from backend.api_v1.user_group.user_group_schema import (
    UserGroup as UserGroupSchema,
    UserGroupCreate,
    UserGroupUpdate,
)
from backend.api_v1.user_group.user_group_dependencies import get_user_group_service
from backend.utils.enums import OperationTypes

router = APIRouter(prefix="/user_groups", tags=["User Groups"])


async def user_group_by_id(
    user_group_id: int,
    service: UserGroupService = Depends(get_user_group_service),
) -> UserGroupSchema:
    """Dependency to get user group by ID or raise 404"""
    user_group = await service.get_user_group_by_id(user_group_id)
    if not user_group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User group with ID {user_group_id} not found",
        )
    return user_group


async def user_group_by_name(
    name: str,
    service: UserGroupService = Depends(get_user_group_service),
) -> UserGroupSchema:
    """Dependency to get user group by name or raise 404"""
    user_group = await service.get_user_group_by_name(name)
    if not user_group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User group with name '{name}' not found",
        )
    return user_group


@router.get("", response_model=List[UserGroupSchema])
async def get_user_groups(
    service: UserGroupService = Depends(get_user_group_service),
    user_group_type_id: Optional[int] = Query(
        None, description="Filter groups by user group type ID"
    ),
):
    """Get all user groups, optionally filtered by user group type"""
    return await service.get_user_groups(user_group_type_id=user_group_type_id)


@router.get("/{user_group_id}", response_model=UserGroupSchema)
async def get_user_group_by_id(
    user_group: UserGroupSchema = Depends(user_group_by_id),
):
    """Get specific user group by ID"""
    return user_group


@router.get("/by_name/{name}", response_model=UserGroupSchema)
async def get_user_group_by_name(
    user_group: UserGroupSchema = Depends(user_group_by_name),
):
    """Get user group by name"""
    return user_group


@router.post("", response_model=UserGroupSchema, status_code=status.HTTP_201_CREATED)
async def create_user_group(
    user_group_in: UserGroupCreate,
    current_user=Depends(require_operation(OperationTypes.CREATE_USER_GROUP.value)),
    service: UserGroupService = Depends(get_user_group_service),
):
    """Create a new user group"""
    # Check if user group with same name already exists
    existing_user_group = await service.get_user_group_by_name(user_group_in.name)
    if existing_user_group:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User group with name '{user_group_in.name}' already exists",
        )

    return await service.create_user_group(user_group_in)


@router.patch("/{user_group_id}", response_model=UserGroupSchema)
async def update_user_group_partial(
    user_group_update: UserGroupUpdate,
    user_group: UserGroupSchema = Depends(user_group_by_id),
    service: UserGroupService = Depends(get_user_group_service),
):
    """Partial update of a user group"""
    # Check if name is being updated and if it already exists
    if user_group_update.name and user_group_update.name != user_group.name:
        existing_user_group = await service.get_user_group_by_name(
            user_group_update.name
        )
        if existing_user_group:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User group with name '{user_group_update.name}' already exists",
            )

    return await service.update_user_group(
        user_group.id, user_group_update, partial=True
    )


@router.delete("/{user_group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_group(
    user_group: UserGroupSchema = Depends(user_group_by_id),
    service: UserGroupService = Depends(get_user_group_service),
) -> None:
    """Delete a user group"""
    await service.delete_user_group(user_group.id)
