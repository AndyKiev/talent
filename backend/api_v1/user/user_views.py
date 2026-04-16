from fastapi import APIRouter, Depends, status, Query
from fastapi.security import HTTPBearer
from typing import Annotated, List, Optional
from pydantic import BaseModel

from backend.api_v1.user.user_schema import (
    User as UserSchema,
    UserCreate,
    UserUpdate,
)
from backend.api_v1.user.user_dependency import (
    get_user_service,
    user_by_id,
    user_by_code,
)
from backend.api_v1.user.user_service import UserService, SyncUserResult
from backend.auth.jwt_auth import require_operation
from backend.utils.enums import OperationTypes

router = APIRouter(
    prefix="/users",
    tags=["Users"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)

# ---------------------------------------------------------------------------
# CRUD endpoints
# ---------------------------------------------------------------------------


@router.get("", response_model=List[UserSchema])
async def get_users(
    service: Annotated[UserService, Depends(get_user_service)],
    job_id: Optional[int] = Query(None, description="Filter users by job ID"),
):
    """Get all users, optionally filtered by job ID."""
    filters = {"job_id": job_id} if job_id is not None else None
    return await service.get_all(params=filters)


@router.get("/by_job/{job_id}", response_model=List[UserSchema])
async def get_users_by_job_id_legacy(
    job_id: int,
    service: Annotated[UserService, Depends(get_user_service)],
):
    """[LEGACY] Get users by job ID — prefer /users?job_id={job_id} instead."""
    return await service.get_all(params={"job_id": job_id})


@router.get("/{user_id}", response_model=UserSchema)
async def get_user_by_id(user: UserSchema = Depends(user_by_id)):
    return user


@router.get("/code/{user_code}", response_model=UserSchema)
async def get_user_by_code(user: UserSchema = Depends(user_by_code)):
    return user


@router.post("", response_model=UserSchema, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_in: UserCreate,
    service: Annotated[UserService, Depends(get_user_service)],
    _: UserSchema = Depends(require_operation(OperationTypes.CREATE_USER.value)),
):
    return await service.create_user(user_in)


@router.patch("/{user_id}", response_model=UserSchema)
async def update_user(
    user_update: UserUpdate,
    user: UserSchema = Depends(user_by_id),
    service: Annotated[UserService, Depends(get_user_service)] = None,
):
    return await service.update_user(user.id, user_update)


@router.patch("/{user_id}/status/{is_active}", response_model=UserSchema)
async def update_user_status(
    is_active: bool,
    user: UserSchema = Depends(user_by_id),
    service: Annotated[UserService, Depends(get_user_service)] = None,
):
    return await service.update_user(user.id, UserUpdate(is_active=is_active))


@router.patch("/{user_id}/lang/{lang_id}", response_model=UserSchema)
async def update_user_lang(
    lang_id: int,
    user: UserSchema = Depends(user_by_id),
    service: Annotated[UserService, Depends(get_user_service)] = None,
):
    return await service.update_user(user.id, UserUpdate(lang_id=lang_id))


@router.patch("/{user_id}/job/{job_id}", response_model=UserSchema)
async def update_user_job(
    job_id: int,
    user: UserSchema = Depends(user_by_id),
    service: Annotated[UserService, Depends(get_user_service)] = None,
):
    return await service.update_user(user.id, UserUpdate(job_id=job_id))


@router.delete("/{user_id}", status_code=status.HTTP_200_OK)
async def delete_user(
    user_id: int,
    service: Annotated[UserService, Depends(get_user_service)],
):
    """
    Delegates entirely to the service.
    On success the service raises HTTPException(200) with translated message.
    On error the service raises a typed DomainError converted by the global handler.
    """
    await service.delete_user(user_id)


# ---------------------------------------------------------------------------
# Group endpoints
# ---------------------------------------------------------------------------


@router.get("/{user_id}/groups", response_model=List[str])
async def get_user_groups(user: UserSchema = Depends(user_by_id)):
    return user.groups


@router.get("/code/{user_code}/groups", response_model=List[str])
async def get_user_groups_by_code(user: UserSchema = Depends(user_by_code)):
    return user.groups


@router.post("/{user_id}/groups/{user_group_id}", response_model=UserSchema)
async def add_user_to_group(
    user_group_id: int,
    user: UserSchema = Depends(user_by_id),
    service: UserService = Depends(get_user_service),
):
    return await service.add_to_group(user.id, user_group_id)


@router.delete("/{user_id}/groups/{user_group_id}", response_model=UserSchema)
async def remove_user_from_group(
    user_group_id: int,
    user: UserSchema = Depends(user_by_id),
    service: UserService = Depends(get_user_service),
):
    return await service.remove_from_group(user.id, user_group_id)


class UserGroupsUpdate(BaseModel):
    group_ids: List[int]


@router.put("/{user_id}/groups", response_model=UserSchema)
async def set_user_groups(
    groups_update: UserGroupsUpdate,
    user: UserSchema = Depends(user_by_id),
    service: UserService = Depends(get_user_service),
):
    return await service.set_groups(user.id, groups_update.group_ids)


# ---------------------------------------------------------------------------
# Job-group sync endpoint  (doll #1 — single user)
# ---------------------------------------------------------------------------


@router.post(
    "/{user_id}/sync_groups_from_job",
    response_model=SyncUserResult,
    summary="Sync user groups from their job",
    description=(
        "Full two-way sync: adds groups linked to the user's job that the user "
        "doesn't have yet, and removes groups the user has that are no longer "
        "linked to their job."
    ),
)
async def sync_user_groups_from_job(
    user: UserSchema = Depends(user_by_id),
    service: UserService = Depends(get_user_service),
) -> SyncUserResult:
    """
    Doll #1 — full two-way sync for a single user: adds missing job-groups,
    removes groups the user has that are no longer on their job.
    """
    _, added, removed = await service.repository.sync_groups_from_job(user.id)
    return SyncUserResult(
        user_id=user.id,
        links_added=added,
        links_removed=removed,
    )
