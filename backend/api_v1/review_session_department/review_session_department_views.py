from typing import Annotated

from fastapi import APIRouter, Depends, status

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.review_session_department.review_session_department_dependencies import (
    get_review_session_department_service,
)
from backend.api_v1.review_session_department.review_session_department_schema import (
    ReviewSessionDepartment as ReviewSessionDepartmentSchema,
)
from backend.api_v1.review_session_department.review_session_department_schema import (
    ReviewSessionDepartmentCreate,
)
from backend.api_v1.review_session_department.review_session_department_service import (
    ReviewSessionDepartmentService,
)
from backend.auth.jwt_auth import get_current_active_auth_user

router = APIRouter(
    prefix="/review_sessions",
    tags=["Review Session Departments"],
    dependencies=[Depends(get_current_active_auth_user)],
)


@router.get(
    "/{session_id}/departments",
    response_model=list[ReviewSessionDepartmentSchema],
)
async def get_session_departments(
    session_id: int,
    service: Annotated[
        ReviewSessionDepartmentService,
        Depends(get_review_session_department_service),
    ],
):
    return await service.get_departments_for_session(session_id)


@router.post(
    "/{session_id}/departments",
    response_model=MutationResponse[ReviewSessionDepartmentSchema],
    status_code=status.HTTP_201_CREATED,
)
async def link_department_to_session(
    session_id: int,
    dep_in: ReviewSessionDepartmentCreate,
    service: Annotated[
        ReviewSessionDepartmentService,
        Depends(get_review_session_department_service),
    ],
):
    return await service.link_department(session_id, dep_in)


@router.delete(
    "/{session_id}/departments/{rsd_id}",
    response_model=MutationResponse[None],
)
async def unlink_department_from_session(
    session_id: int,
    rsd_id: int,
    service: Annotated[
        ReviewSessionDepartmentService,
        Depends(get_review_session_department_service),
    ],
):
    return await service.unlink_department(rsd_id)
