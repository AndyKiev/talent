from fastapi import APIRouter, Depends, status, Query
from fastapi.security import HTTPBearer
from typing import Annotated, List, Optional
from pydantic import BaseModel

from backend.api_v1.employee.employee_schema import (
    EmployeeSchema,
    EmployeeCreate,
    EmployeeUpdate,
    EmployeePersonalDataUpdate,
    EmployeeWithActivationCreate,
)
from backend.api_v1.employee.employee_dependencies import (
    get_employee_service,
    employee_by_id,
    employee_by_code,
)
from backend.api_v1.employee.employee_service import EmployeeService, SyncUserResult
from backend.api_v1.employee_events.employee_event.employee_event_dependencies import (
    get_employee_event_service,
)
from backend.api_v1.employee_events.employee_event.employee_event_service import (
    EmployeeEventService,
)
from backend.auth.jwt_auth import require_operation
from backend.utils.enums import OperationTypes
from backend.auth.guards import Guard
from backend.utils.enums import OperationVerb, EssenceName

router = APIRouter(
    prefix="/employees",
    tags=["Employees"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)

# ---------------------------------------------------------------------------
# CRUD endpoints
# ---------------------------------------------------------------------------


@router.get(
    "",
    response_model=List[EmployeeSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.EMPLOYEE)],
)
async def get_employees(
    service: Annotated[EmployeeService, Depends(get_employee_service)],
    job_id: Optional[int] = Query(None, description="Filter users by job ID"),
    department_id: Optional[int] = Query(
        None, description="Filter users whose main department is in this department's subtree"
    ),
):
    """Get all users, optionally filtered by job ID and/or department subtree."""
    filters = {"job_id": job_id} if job_id is not None else None
    return await service.get_all(params=filters, department_id=department_id)


@router.get(
    "/by_job/{job_id}",
    response_model=List[EmployeeSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.EMPLOYEE)],
)
async def get_users_by_job_id_legacy(
    job_id: int,
    service: Annotated[EmployeeService, Depends(get_employee_service)],
):
    """[LEGACY] Get users by job ID — prefer /users?job_id={job_id} instead."""
    return await service.get_all(params={"job_id": job_id})


@router.get(
    "/scope_departments",
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.EMPLOYEE)],
)
async def get_scope_departments(
    service: Annotated[EmployeeService, Depends(get_employee_service)],
):
    """
    Ordered departments for the employees-page filter Select:
    store (by region sort_order) -> directorate (by region sort_order) -> other.
    Only active MAIN departments (category is_main=True) are returned.
    admin/HRS/dev get all; HRM gets their active responsibility departments; others []
    """
    return await service.get_scope_select_departments()


@router.get(
    "/{employee_id}",
    response_model=EmployeeSchema,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.EMPLOYEE)],
)
async def get_user_by_id(user: EmployeeSchema = Depends(employee_by_id)):
    return user


@router.get(
    "/code/{employee_code}",
    response_model=EmployeeSchema,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.EMPLOYEE)],
)
async def get_user_by_code(user: EmployeeSchema = Depends(employee_by_code)):
    return user


@router.post(
    "",
    response_model=EmployeeSchema,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.CREATE, EssenceName.EMPLOYEE)],
)
async def create_user(
    user_in: EmployeeCreate,
    service: Annotated[EmployeeService, Depends(get_employee_service)],
    # _: EmployeeSchema = Depends(require_operation(OperationTypes.CREATE_USER.value)),
):
    return await service.create_user(user_in)


@router.post(
    "/with_activation",
    response_model=EmployeeSchema,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.CREATE, EssenceName.EMPLOYEE)],
)
async def create_employee_with_activation(
    payload: EmployeeWithActivationCreate,
    employee_service: Annotated[EmployeeService, Depends(get_employee_service)],
    event_service: Annotated[EmployeeEventService, Depends(get_employee_event_service)],
):
    """
    Atomic creation of a new employee (pending status, no job, no departments)
    plus an activation event pre-filled with MAIN_DEPT_CHANGE, JOB_CHANGE,
    and auto STATUS_CHANGE -> working.
    """
    # 1) Create the employee
    employee = await employee_service.create_user(
        EmployeeCreate(
            code=payload.code,
            name=payload.name,
            email=payload.email,
            is_active=payload.is_active,
            lang_id=payload.lang_id,
        )
    )

    # 2) Create the activation event with change rows.
    try:
        await event_service.create_activation_for_employee(
            employee_id=employee.id,
            effective_date=payload.effective_date,
            department_id=payload.department_id,
            job_id=payload.job_id,
            description=payload.description,
        )
    except Exception:
        await employee_service.repository.delete_by_id(employee.id)
        raise

    # 3) Re-fetch the employee to include fresh data in the response
    return await employee_service.get_by_id(employee.id)


@router.patch(
    "/{employee_id}",
    response_model=EmployeeSchema,
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.EMPLOYEE)],
)
async def update_user(
    user_update: EmployeeUpdate,
    user: EmployeeSchema = Depends(employee_by_id),
    service: Annotated[EmployeeService, Depends(get_employee_service)] = None,
):
    return await service.update_user(user.id, user_update)


@router.patch(
    "/{employee_id}/status/{is_active}",
    response_model=EmployeeSchema,
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.EMPLOYEE)],
)
async def update_user_status(
    is_active: bool,
    user: EmployeeSchema = Depends(employee_by_id),
    service: Annotated[EmployeeService, Depends(get_employee_service)] = None,
):
    return await service.update_user(user.id, EmployeeUpdate(is_active=is_active))


@router.patch(
    "/{employee_id}/lang/{lang_id}",
    response_model=EmployeeSchema,
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.EMPLOYEE)],
)
async def update_user_lang(
    lang_id: int,
    user: EmployeeSchema = Depends(employee_by_id),
    service: Annotated[EmployeeService, Depends(get_employee_service)] = None,
):
    return await service.update_user(user.id, EmployeeUpdate(lang_id=lang_id))


@router.patch("/{employee_id}/current_level/{level_id}", response_model=EmployeeSchema)
async def update_user_current_level(
    level_id: int,
    user: EmployeeSchema = Depends(employee_by_id),
    service: Annotated[EmployeeService, Depends(get_employee_service)] = None,
):
    return await service.set_current_level(user.id, level_id)


@router.patch("/{employee_id}/personal_data", response_model=EmployeeSchema)
async def update_user_personal_data(
    data: EmployeePersonalDataUpdate,
    user: EmployeeSchema = Depends(employee_by_id),
    service: Annotated[EmployeeService, Depends(get_employee_service)] = None,
):
    return await service.set_personal_data(user.id, data)


@router.patch(
    "/{employee_id}/job/{job_id}",
    response_model=EmployeeSchema,
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.EMPLOYEE)],
)
async def update_user_job(
    job_id: int,
    employee: EmployeeSchema = Depends(employee_by_id),
    service: Annotated[EmployeeService, Depends(get_employee_service)] = None,
):
    return await service.update_user(employee.id, EmployeeUpdate(job_id=job_id))


@router.delete(
    "/{employee_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.DELETE, EssenceName.EMPLOYEE)],
)
async def delete_user(
    employee_id: int,
    service: Annotated[EmployeeService, Depends(get_employee_service)],
    force: bool = False,
):
    """
    Delegates entirely to the service.
    On success the service raises HTTPException(200) with translated message.
    On error the service raises a typed DomainError converted by the global handler.

    `force=true` is honoured ONLY for superadmin/dev users: it cascade-deletes the
    employee's own dependent records (events + their changes, department links)
    before deleting. Records that belong to OTHER employees (authored_*) still block.
    """
    await service.delete_user(employee_id, force=force)


# ---------------------------------------------------------------------------
# Group endpoints
# ---------------------------------------------------------------------------


@router.get(
    "/{user_id}/groups",
    response_model=List[str],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.EMPLOYEE)],
)
async def get_user_groups(user: EmployeeSchema = Depends(employee_by_id)):
    return user.groups


@router.get(
    "/code/{user_code}/groups",
    response_model=List[str],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.EMPLOYEE)],
)
async def get_user_groups_by_code(user: EmployeeSchema = Depends(employee_by_code)):
    return user.groups


@router.post(
    "/{user_id}/groups/{user_group_id}",
    response_model=EmployeeSchema,
    dependencies=[
        Guard(OperationVerb.LINK, EssenceName.EMPLOYEE, EssenceName.USER_GROUP)
    ],
)
async def add_user_to_group(
    user_group_id: int,
    user: EmployeeSchema = Depends(employee_by_id),
    service: EmployeeService = Depends(get_employee_service),
):
    return await service.add_to_group(user.id, user_group_id)


@router.delete(
    "/{user_id}/groups/{user_group_id}",
    response_model=EmployeeSchema,
    dependencies=[
        Guard(OperationVerb.LINK, EssenceName.EMPLOYEE, EssenceName.USER_GROUP)
    ],
)
async def remove_user_from_group(
    user_group_id: int,
    user: EmployeeSchema = Depends(employee_by_id),
    service: EmployeeService = Depends(get_employee_service),
):
    return await service.remove_from_group(user.id, user_group_id)


class UserGroupsUpdate(BaseModel):
    group_ids: List[int]


@router.put(
    "/{user_id}/groups",
    response_model=EmployeeSchema,
    dependencies=[
        Guard(OperationVerb.LINK, EssenceName.EMPLOYEE, EssenceName.USER_GROUP)
    ],
)
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
    dependencies=[
        Guard(OperationVerb.SYNC, EssenceName.EMPLOYEE, EssenceName.USER_GROUP)
    ],
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