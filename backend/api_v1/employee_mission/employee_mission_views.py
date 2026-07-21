from typing import Annotated, List

from fastapi import APIRouter, Depends
from fastapi.security import HTTPBearer

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee_mission.employee_mission_dependencies import (
    get_employee_mission_service,
)
from backend.api_v1.employee_mission.employee_mission_schema import (
    EmployeeMissionCreate,
    EmployeeMissionHistoryEntry,
    EmployeeMissionSchema,
    EmployeeMissionUpdate,
)
from backend.api_v1.employee_mission.employee_mission_service import (
    EmployeeMissionService,
)
from backend.api_v1.review_session_employee.people_review_access import (
    PeopleReviewScopedGuard,
)
from backend.auth.guards import Guard
from backend.utils.enums import EssenceName, OperationVerb

router = APIRouter(
    prefix="/employee_missions",
    tags=["Employee Missions"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get(
    "/employee/{employee_id}",
    response_model=List[EmployeeMissionSchema],
    dependencies=[
        PeopleReviewScopedGuard(OperationVerb.VIEW, EssenceName.EMPLOYEE_MISSION)
    ],
)
async def get_missions_for_employee(
    employee_id: int,
    service: Annotated[EmployeeMissionService, Depends(get_employee_mission_service)],
):
    """An employee's development missions, newest first."""
    return await service.get_missions_for_employee(employee_id)


@router.get(
    "/employee/{employee_id}/history",
    response_model=List[EmployeeMissionHistoryEntry],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.EMPLOYEE_MISSION_HISTORY)],
)
async def get_employee_mission_history(
    employee_id: int,
    service: Annotated[EmployeeMissionService, Depends(get_employee_mission_service)],
):
    """All mission/KPI changes for one employee, INCLUDING deleted missions —
    the only place a removed mission remains visible (HRM, HRS, admin, dev)."""
    return await service.get_employee_history(employee_id)


@router.post(
    "/employee/{employee_id}",
    response_model=MutationResponse[EmployeeMissionSchema],
)
async def create_mission(
    employee_id: int,
    payload: EmployeeMissionCreate,
    service: Annotated[EmployeeMissionService, Depends(get_employee_mission_service)],
):
    """Create a mission with at least one KPI and an optional competence.

    No route Guard: the write rule is roster-scoped (only the employee's oversight
    manager, or admin) and lives in EmployeeMissionAccess.assert_can_manage, which
    the service calls first.
    """
    return await service.create_mission(employee_id, payload)


@router.patch(
    "/{mission_id}",
    response_model=MutationResponse[EmployeeMissionSchema],
)
async def update_mission(
    mission_id: int,
    payload: EmployeeMissionUpdate,
    service: Annotated[EmployeeMissionService, Depends(get_employee_mission_service)],
):
    return await service.update_mission(mission_id, payload)


@router.post(
    "/{mission_id}/revert",
    response_model=MutationResponse[EmployeeMissionSchema],
)
async def revert_mission_progress(
    mission_id: int,
    service: Annotated[EmployeeMissionService, Depends(get_employee_mission_service)],
):
    """Roll every KPI back one recorded step (admin/dev only).

    No route Guard: the admin-only rule lives in the service alongside the
    roster-scoped rules, so all mission permissions read from one place.
    """
    return await service.revert_progress(mission_id)


@router.delete("/{mission_id}")
async def delete_mission(
    mission_id: int,
    service: Annotated[EmployeeMissionService, Depends(get_employee_mission_service)],
):
    return {"detail": await service.delete_mission(mission_id)}


@router.get(
    "/{mission_id}/history",
    response_model=List[EmployeeMissionHistoryEntry],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.EMPLOYEE_MISSION_HISTORY)],
)
async def get_mission_history(
    mission_id: int,
    service: Annotated[EmployeeMissionService, Depends(get_employee_mission_service)],
):
    """Mission + KPI change trail, newest first (HRM, HRS, admin, dev)."""
    return await service.get_mission_history(mission_id)
