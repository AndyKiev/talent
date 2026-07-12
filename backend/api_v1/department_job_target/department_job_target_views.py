from datetime import date
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, Query, status
from fastapi.security import HTTPBearer

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.department_job_target.department_job_target_dependencies import (
    ensure_headcount_plan_enabled,
    get_department_job_target_service,
)
from backend.api_v1.department_job_target.department_job_target_schema import (
    DepartmentJobTarget as DepartmentJobTargetSchema,
    DepartmentJobTargetCreate,
    DepartmentJobTargetUpdate,
    FactEmployee,
    HeadcountCalcRow,
    TargetCountByLink,
)
from backend.api_v1.department_job_target.department_job_target_service import (
    DepartmentJobTargetService,
)
from backend.auth.guards import Guard
from backend.utils.enums import OperationVerb, EssenceName

router = APIRouter(
    prefix="/department_job_targets",
    tags=["Department Job Targets"],
    dependencies=[
        Depends(HTTPBearer(auto_error=False)),
        Depends(ensure_headcount_plan_enabled),
    ],
)


@router.get(
    "/calculate",
    response_model=List[HeadcountCalcRow],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.DEPARTMENT_JOB_TARGET)],
)
async def calculate_headcount(
    service: Annotated[
        DepartmentJobTargetService, Depends(get_department_job_target_service)
    ],
    department_id: int = Query(...),
    on_date: date = Query(...),
):
    """Plan-vs-fact per job for a department instance as of a date."""
    return await service.calculate(department_id, on_date)


@router.get(
    "/fact_employees",
    response_model=List[FactEmployee],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.DEPARTMENT_JOB_TARGET)],
)
async def get_fact_employees(
    service: Annotated[
        DepartmentJobTargetService, Depends(get_department_job_target_service)
    ],
    department_id: int = Query(...),
    on_date: date = Query(...),
    job_id: int = Query(...),
):
    """The employees behind one fact qty (dept + job + date, as-of replay)."""
    return await service.get_fact_employees(department_id, on_date, job_id)


@router.get(
    "/count_by_link/{link_id}",
    response_model=TargetCountByLink,
    dependencies=[
        Guard(OperationVerb.VIEW, EssenceName.DEPARTMENT_TYPE, EssenceName.JOB)
    ],
)
async def count_targets_by_link(
    link_id: int,
    service: Annotated[
        DepartmentJobTargetService, Depends(get_department_job_target_service)
    ],
):
    """How many target rows a link delete would cascade away (FE warning)."""
    return await service.count_by_link(link_id)


@router.get(
    "",
    response_model=List[DepartmentJobTargetSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.DEPARTMENT_JOB_TARGET)],
)
async def get_department_job_targets(
    service: Annotated[
        DepartmentJobTargetService, Depends(get_department_job_target_service)
    ],
    department_id: int = Query(...),
    department_type_job_link_id: Optional[int] = Query(None),
):
    """Dated target history for a department (optionally one job link)."""
    return await service.get_targets(department_id, department_type_job_link_id)


@router.post(
    "",
    response_model=MutationResponse[DepartmentJobTargetSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.CREATE, EssenceName.DEPARTMENT_JOB_TARGET)],
)
async def create_department_job_target(
    target_in: DepartmentJobTargetCreate,
    service: Annotated[
        DepartmentJobTargetService, Depends(get_department_job_target_service)
    ],
):
    """Add an effective-dated target qty for a department + job link."""
    return await service.create_target(target_in)


@router.patch(
    "/{department_job_target_id}",
    response_model=MutationResponse[DepartmentJobTargetSchema],
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.DEPARTMENT_JOB_TARGET)],
)
async def update_department_job_target(
    department_job_target_id: int,
    target_update: DepartmentJobTargetUpdate,
    service: Annotated[
        DepartmentJobTargetService, Depends(get_department_job_target_service)
    ],
):
    """Change the qty of one dated entry (author/set-at refreshed)."""
    return await service.update_target(department_job_target_id, target_update)


@router.delete(
    "/{department_job_target_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.DELETE, EssenceName.DEPARTMENT_JOB_TARGET)],
)
async def delete_department_job_target(
    department_job_target_id: int,
    service: Annotated[
        DepartmentJobTargetService, Depends(get_department_job_target_service)
    ],
):
    """Remove one dated target entry."""
    await service.delete_target(department_job_target_id)
