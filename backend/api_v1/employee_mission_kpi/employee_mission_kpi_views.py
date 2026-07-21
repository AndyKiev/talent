from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.security import HTTPBearer

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee_mission.employee_mission_schema import (
    EmployeeMissionKpiSchema,
)
from backend.api_v1.employee_mission_kpi.employee_mission_kpi_dependencies import (
    get_employee_mission_kpi_service,
)
from backend.api_v1.employee_mission_kpi.employee_mission_kpi_schema import (
    EmployeeMissionKpiCreate,
    EmployeeMissionKpiUpdate,
)
from backend.api_v1.employee_mission_kpi.employee_mission_kpi_service import (
    EmployeeMissionKpiService,
)

router = APIRouter(
    prefix="/employee_mission_kpis",
    tags=["Employee Mission KPIs"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)

# No route Guards here on purpose: every path is keyed by kpi_id / mission_id, so
# there is no {employee_id} for a scoped guard to read. The service resolves the
# owning employee and calls EmployeeMissionAccess.assert_can_manage first.
# There is deliberately NO read route here: KPIs are only ever read through
# GET /employee_missions/employee/{employee_id}, which carries the scoped read
# guard. Adding one later would need its own assert_can_read, exactly like the
# comment and dimension-link GETs.


@router.post(
    "/mission/{mission_id}",
    response_model=MutationResponse[EmployeeMissionKpiSchema],
)
async def create_kpi(
    mission_id: int,
    payload: EmployeeMissionKpiCreate,
    service: Annotated[
        EmployeeMissionKpiService, Depends(get_employee_mission_kpi_service)
    ],
):
    return await service.create_kpi(mission_id, payload)


@router.patch(
    "/{kpi_id}",
    response_model=MutationResponse[EmployeeMissionKpiSchema],
)
async def update_kpi(
    kpi_id: int,
    payload: EmployeeMissionKpiUpdate,
    service: Annotated[
        EmployeeMissionKpiService, Depends(get_employee_mission_kpi_service)
    ],
):
    """Edit the KPI text and/or set its fulfilment percentage (0-100)."""
    return await service.update_kpi(kpi_id, payload)


@router.delete("/{kpi_id}")
async def delete_kpi(
    kpi_id: int,
    service: Annotated[
        EmployeeMissionKpiService, Depends(get_employee_mission_kpi_service)
    ],
):
    """Refused when it is the mission's last KPI."""
    return {"detail": await service.delete_kpi(kpi_id)}
