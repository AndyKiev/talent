from typing import Annotated, Optional

from fastapi import APIRouter, Depends

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.review_session_employee_level.review_session_employee_level_dependencies import (
    get_review_session_employee_level_service,
)
from backend.api_v1.review_session_employee_level.review_session_employee_level_schema import (
    ProposedLevelSchema,
    ProposedLevelStatusUpdate,
    ProposedLevelUpsert,
)
from backend.api_v1.review_session_employee_level.review_session_employee_level_service import (
    ReviewSessionEmployeeLevelService,
)
from backend.api_v1.review_session_level.review_session_level_schema import (
    SessionLevelSchema,
)
from backend.auth.jwt_auth import get_current_active_auth_user

# Mounted under the review_session_employees namespace: the proposed level is a
# sub-resource of a single per-employee review record (rse_id).
router = APIRouter(
    prefix="/review_session_employees",
    tags=["Review Session Employee Level"],
    dependencies=[Depends(get_current_active_auth_user)],
)


@router.get(
    "/{rse_id}/available_levels",
    response_model=list[SessionLevelSchema],
)
async def get_available_levels(
    rse_id: int,
    service: Annotated[
        ReviewSessionEmployeeLevelService,
        Depends(get_review_session_employee_level_service),
    ],
):
    """The session's frozen competency levels (+ requirements) selectable for this
    employee review — falls back to live active levels for pre-freeze sessions."""
    return await service.get_session_levels(rse_id)


@router.get(
    "/{rse_id}/proposed_level",
    response_model=Optional[ProposedLevelSchema],
)
async def get_proposed_level(
    rse_id: int,
    service: Annotated[
        ReviewSessionEmployeeLevelService,
        Depends(get_review_session_employee_level_service),
    ],
):
    return await service.get_proposed_level(rse_id)


@router.put(
    "/{rse_id}/proposed_level",
    response_model=MutationResponse[ProposedLevelSchema],
)
async def save_proposed_level(
    rse_id: int,
    payload: ProposedLevelUpsert,
    service: Annotated[
        ReviewSessionEmployeeLevelService,
        Depends(get_review_session_employee_level_service),
    ],
):
    return await service.upsert_proposed_level(rse_id, payload)


@router.patch(
    "/{rse_id}/proposed_level/status",
    response_model=MutationResponse[ProposedLevelSchema],
)
async def set_proposed_level_status(
    rse_id: int,
    payload: ProposedLevelStatusUpdate,
    service: Annotated[
        ReviewSessionEmployeeLevelService,
        Depends(get_review_session_employee_level_service),
    ],
):
    return await service.set_status(rse_id, payload)


@router.delete(
    "/{rse_id}/proposed_level",
    response_model=MutationResponse[None],
)
async def delete_proposed_level(
    rse_id: int,
    service: Annotated[
        ReviewSessionEmployeeLevelService,
        Depends(get_review_session_employee_level_service),
    ],
):
    return await service.delete_proposed_level(rse_id)
