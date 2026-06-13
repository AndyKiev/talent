from fastapi import APIRouter, Depends
from fastapi.security import HTTPBearer
from typing import Annotated, Optional

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.review_session_employee_level.review_session_employee_level_schema import (
    ProposedLevelSchema,
    ProposedLevelUpsert,
    ProposedLevelStatusUpdate,
)
from backend.api_v1.review_session_employee_level.review_session_employee_level_dependencies import (
    get_review_session_employee_level_service,
)
from backend.api_v1.review_session_employee_level.review_session_employee_level_service import (
    ReviewSessionEmployeeLevelService,
)

# Mounted under the review_session_employees namespace: the proposed level is a
# sub-resource of a single per-employee review record (rse_id).
router = APIRouter(
    prefix="/review_session_employees",
    tags=["Review Session Employee Level"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


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
