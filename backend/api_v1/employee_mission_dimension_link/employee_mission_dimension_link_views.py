from typing import Annotated, Optional

from fastapi import APIRouter, Depends
from fastapi.security import HTTPBearer

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee_mission_dimension_link.employee_mission_dimension_link_dependencies import (
    get_employee_mission_dimension_link_service,
)
from backend.api_v1.employee_mission_dimension_link.employee_mission_dimension_link_schema import (
    EmployeeMissionDimensionLinkSchema,
    EmployeeMissionDimensionLinkSet,
)
from backend.api_v1.employee_mission_dimension_link.employee_mission_dimension_link_service import (
    EmployeeMissionDimensionLinkService,
)

router = APIRouter(
    prefix="/employee_mission_dimension_links",
    tags=["Employee Mission ↔ Competence Links"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)

# Keyed by mission_id, so the same reasoning as the KPI router applies: no route
# Guard is possible (no {employee_id} in the path), and the service resolves the
# owning employee before gating — assert_can_read for the GET, assert_can_manage
# for the writes.


@router.get(
    "/mission/{mission_id}",
    response_model=Optional[EmployeeMissionDimensionLinkSchema],
)
async def get_link_for_mission(
    mission_id: int,
    service: Annotated[
        EmployeeMissionDimensionLinkService,
        Depends(get_employee_mission_dimension_link_service),
    ],
):
    """The mission's competence link (or null when it has none)."""
    return await service.get_for_mission(mission_id)


@router.put(
    "/mission/{mission_id}",
    response_model=MutationResponse[EmployeeMissionDimensionLinkSchema],
)
async def set_dimension_for_mission(
    mission_id: int,
    payload: EmployeeMissionDimensionLinkSet,
    service: Annotated[
        EmployeeMissionDimensionLinkService,
        Depends(get_employee_mission_dimension_link_service),
    ],
):
    """Set (upsert) the single competence of a mission — replaces any existing."""
    return await service.set_for_mission(mission_id, payload.dimension_id)


@router.delete("/mission/{mission_id}")
async def clear_dimension_for_mission(
    mission_id: int,
    service: Annotated[
        EmployeeMissionDimensionLinkService,
        Depends(get_employee_mission_dimension_link_service),
    ],
):
    """Remove the competence from a mission (the mission itself stays)."""
    return {"detail": await service.clear_for_mission(mission_id)}
