from typing import Annotated, List

from fastapi import APIRouter, Depends
from fastapi.security import HTTPBearer

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee_mission_status.employee_mission_status_dependencies import (
    get_employee_mission_status_service,
)
from backend.api_v1.employee_mission_status.employee_mission_status_schema import (
    EmployeeMissionStatus as StatusSchema,
    EmployeeMissionStatusCreate,
    EmployeeMissionStatusUpdate,
)
from backend.api_v1.employee_mission_status.employee_mission_status_service import (
    EmployeeMissionStatusService,
)
from backend.auth.guards import Guard
from backend.utils.enums import EssenceName, OperationVerb

router = APIRouter(
    prefix="/employee_mission_statuses",
    tags=["Employee Mission Statuses"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get("", response_model=List[StatusSchema])
async def get_statuses(
    service: Annotated[
        EmployeeMissionStatusService, Depends(get_employee_mission_status_service)
    ],
):
    """Any authenticated user: the mission list renders these labels, and a
    plain employee reading their own plan must be able to resolve them."""
    return await service.get_all(sort={"sort_order": "asc"})


@router.post(
    "",
    response_model=MutationResponse[StatusSchema],
    status_code=201,
    dependencies=[Guard(OperationVerb.CREATE, EssenceName.EMPLOYEE_MISSION_STATUS)],
)
async def create_status(
    payload: EmployeeMissionStatusCreate,
    service: Annotated[
        EmployeeMissionStatusService, Depends(get_employee_mission_status_service)
    ],
):
    return await service.create_status(payload)


@router.patch(
    "/{status_id}",
    response_model=MutationResponse[StatusSchema],
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.EMPLOYEE_MISSION_STATUS)],
)
async def update_status(
    status_id: int,
    payload: EmployeeMissionStatusUpdate,
    service: Annotated[
        EmployeeMissionStatusService, Depends(get_employee_mission_status_service)
    ],
):
    return await service.update_status(status_id, payload)


@router.delete(
    "/{status_id}",
    dependencies=[Guard(OperationVerb.DELETE, EssenceName.EMPLOYEE_MISSION_STATUS)],
)
async def delete_status(
    status_id: int,
    service: Annotated[
        EmployeeMissionStatusService, Depends(get_employee_mission_status_service)
    ],
):
    """Deleting a status a mission still points at is refused by the FK
    (RESTRICT) — the three seeded rows are effectively permanent."""
    record = await service.get_by_id(status_id)
    await service.delete_by_id(status_id, name=record.key)
