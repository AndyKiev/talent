from fastapi import APIRouter, Depends, status, Query
from fastapi.security import HTTPBearer
from typing import Annotated, Optional, List

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.review_session_employee.review_session_employee_schema import (
    ReviewSessionEmployee as RSESchema,
    ReviewSessionEmployeeList as RSEListSchema,
)
from backend.api_v1.review_session_employee.review_session_employee_dependencies import (
    get_review_session_employee_service,
)
from backend.api_v1.review_session_employee.review_session_employee_service import (
    ReviewSessionEmployeeService,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.auth.jwt_auth import get_current_active_auth_user

router = APIRouter(
    prefix="/review_session_employees",
    tags=["Review Session Employees"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get("", response_model=List[RSEListSchema])
async def get_review_session_employees(
    service: Annotated[
        ReviewSessionEmployeeService,
        Depends(get_review_session_employee_service),
    ],
    session_id: int = Query(...),
    status_filter: Optional[str] = Query(None, alias="status"),
    sort: Optional[str] = Query(None),
):
    return await service.get_session_employees(
        session_id=session_id, status=status_filter, sort=sort
    )


@router.get("/my", response_model=List[RSEListSchema])
async def get_my_reviews(
    service: Annotated[
        ReviewSessionEmployeeService,
        Depends(get_review_session_employee_service),
    ],
    user: UserSchema = Depends(get_current_active_auth_user),
):
    return await service.get_my_reviews(employee_id=user.id)


@router.get("/{rse_id}", response_model=RSESchema)
async def get_review_session_employee(
    rse_id: int,
    service: Annotated[
        ReviewSessionEmployeeService,
        Depends(get_review_session_employee_service),
    ],
):
    return await service.get_rse_detail(rse_id)


@router.post(
    "/{rse_id}/reviewed",
    response_model=MutationResponse[RSESchema],
)
async def mark_reviewed(
    rse_id: int,
    service: Annotated[
        ReviewSessionEmployeeService,
        Depends(get_review_session_employee_service),
    ],
):
    return await service.change_status(rse_id, "reviewed")


@router.post(
    "/{rse_id}/close",
    response_model=MutationResponse[RSESchema],
)
async def close_rse(
    rse_id: int,
    service: Annotated[
        ReviewSessionEmployeeService,
        Depends(get_review_session_employee_service),
    ],
):
    return await service.change_status(rse_id, "closed")


@router.post(
    "/{rse_id}/revert",
    response_model=MutationResponse[RSESchema],
)
async def revert_rse(
    rse_id: int,
    service: Annotated[
        ReviewSessionEmployeeService,
        Depends(get_review_session_employee_service),
    ],
):
    return await service.revert_status(rse_id)


@router.post(
    "/{rse_id}/reopen",
    response_model=MutationResponse[RSESchema],
)
async def reopen_rse(
    rse_id: int,
    service: Annotated[
        ReviewSessionEmployeeService,
        Depends(get_review_session_employee_service),
    ],
):
    return await service.reopen(rse_id)
