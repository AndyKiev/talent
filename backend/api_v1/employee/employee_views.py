from fastapi import APIRouter, Depends, status, Query
from fastapi.security import HTTPBearer
from typing import Annotated, List, Optional
from pydantic import BaseModel

from backend.api_v1.employee.employee_schema import (
    EmployeeSchema,
    EmployeeCreate,
    EmployeeUpdate,
)
from backend.api_v1.employee.employee_dependencies import (
    get_employee_service,
    employee_by_id,
    employee_by_code,
)
from backend.api_v1.employee.employee_service import EmployeeService, SyncUserResult
from backend.auth.jwt_auth import require_operation
from backend.utils.enums import OperationTypes

router = APIRouter(
    prefix="/employees",
    tags=["Employees"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)

# ---------------------------------------------------------------------------
# CRUD endpoints
# ---------------------------------------------------------------------------


@router.get("", response_model=List[EmployeeSchema])
async def get_employees(
    service: Annotated[EmployeeService, Depends(get_employee_service)],
    job_id: Optional[int] = Query(None, description="Filter users by job ID"),
):
    """Get all users, optionally filtered by job ID."""
    filters = {"job_id": job_id} if job_id is not None else None
    return await service.get_all(params=filters)


@router.get("/by_job/{job_id}", response_model=List[EmployeeSchema])
async def get_users_by_job_id_legacy(
    job_id: int,
    service: Annotated[EmployeeService, Depends(get_employee_service)],
):
    """[LEGACY] Get users by job ID — prefer /users?job_id={job_id} instead."""
    return await service.get_all(params={"job_id": job_id})


@router.get("/{employee_id}", response_model=EmployeeSchema)
async def get_user_by_id(user: EmployeeSchema = Depends(employee_by_id)):
    return user


@router.get("/code/{employee_code}", response_model=EmployeeSchema)
async def get_user_by_code(user: EmployeeSchema = Depends(employee_by_code)):
    return user


@router.post("", response_model=EmployeeSchema, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_in: EmployeeCreate,
    service: Annotated[EmployeeService, Depends(get_employee_service)],
    # _: EmployeeSchema = Depends(require_operation(OperationTypes.CREATE_USER.value)),
):
    return await service.create_user(user_in)


@router.patch("/{employee_id}", response_model=EmployeeSchema)
async def update_user(
    user_update: EmployeeUpdate,
    user: EmployeeSchema = Depends(employee_by_id),
    service: Annotated[EmployeeService, Depends(get_employee_service)] = None,
):
    return await service.update_user(user.id, user_update)


@router.patch("/{employee_id}/status/{is_active}", response_model=EmployeeSchema)
async def update_user_status(
    is_active: bool,
    user: EmployeeSchema = Depends(employee_by_id),
    service: Annotated[EmployeeService, Depends(get_employee_service)] = None,
):
    return await service.update_user(user.id, EmployeeUpdate(is_active=is_active))


@router.patch("/{employee_id}/lang/{lang_id}", response_model=EmployeeSchema)
async def update_user_lang(
    lang_id: int,
    user: EmployeeSchema = Depends(employee_by_id),
    service: Annotated[EmployeeService, Depends(get_employee_service)] = None,
):
    return await service.update_user(user.id, EmployeeUpdate(lang_id=lang_id))


@router.patch(
    "/{employee_id}/current_level/{level_id}", response_model=EmployeeSchema
)
async def update_user_current_level(
    level_id: int,
    user: EmployeeSchema = Depends(employee_by_id),
    service: Annotated[EmployeeService, Depends(get_employee_service)] = None,
):
    return await service.update_user(user.id, EmployeeUpdate(current_level_id=level_id))


@router.patch("/{employee_id}/job/{job_id}", response_model=EmployeeSchema)
async def update_user_job(
    job_id: int,
    employee: EmployeeSchema = Depends(employee_by_id),
    service: Annotated[EmployeeService, Depends(get_employee_service)] = None,
):
    return await service.update_user(employee.id, EmployeeUpdate(job_id=job_id))


@router.delete("/{employee_id}", status_code=status.HTTP_200_OK)
async def delete_user(
    employee_id: int,
    service: Annotated[EmployeeService, Depends(get_employee_service)],
):
    """
    Delegates entirely to the service.
    On success the service raises HTTPException(200) with translated message.
    On error the service raises a typed DomainError converted by the global handler.
    """
    await service.delete_user(employee_id)


# ---------------------------------------------------------------------------
# Group endpoints
# ---------------------------------------------------------------------------


@router.get("/{user_id}/groups", response_model=List[str])
async def get_user_groups(user: EmployeeSchema = Depends(employee_by_id)):
    return user.groups


@router.get("/code/{user_code}/groups", response_model=List[str])
async def get_user_groups_by_code(user: EmployeeSchema = Depends(employee_by_code)):
    return user.groups


@router.post("/{user_id}/groups/{user_group_id}", response_model=EmployeeSchema)
async def add_user_to_group(
    user_group_id: int,
    user: EmployeeSchema = Depends(employee_by_id),
    service: EmployeeService = Depends(get_employee_service),
):
    return await service.add_to_group(user.id, user_group_id)


@router.delete("/{user_id}/groups/{user_group_id}", response_model=EmployeeSchema)
async def remove_user_from_group(
    user_group_id: int,
    user: EmployeeSchema = Depends(employee_by_id),
    service: EmployeeService = Depends(get_employee_service),
):
    return await service.remove_from_group(user.id, user_group_id)


class UserGroupsUpdate(BaseModel):
    group_ids: List[int]


@router.put("/{user_id}/groups", response_model=EmployeeSchema)
async def set_user_groups(
    groups_update: UserGroupsUpdate,
    user: EmployeeSchema = Depends(employee_by_id),
    service: EmployeeService = Depends(get_employee_service),
):
    return await service.set_groups(user.id, groups_update.group_ids)


# ---------------------------------------------------------------------------
# Job-group sync endpoint  (doll #1 — single employee)
# ---------------------------------------------------------------------------


@router.post(
    "/{user_id}/sync_groups_from_job",
    response_model=SyncUserResult,
    summary="Sync employee groups from their job",
    description=(
        "Full two-way sync: adds groups linked to the employee's job that the employee "
        "doesn't have yet, and removes groups the employee has that are no longer "
        "linked to their job."
    ),
)
async def sync_user_groups_from_job(
    user: EmployeeSchema = Depends(employee_by_id),
    service: EmployeeService = Depends(get_employee_service),
) -> SyncUserResult:
    """
    Doll #1 — full two-way sync for a single employee: adds missing job-groups,
    removes groups the employee has that are no longer on their job.
    """
    _, added, removed = await service.repository.sync_groups_from_job(user.id)
    return SyncUserResult(
        user_id=user.id,
        links_added=added,
        links_removed=removed,
    )
