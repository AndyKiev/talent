from fastapi import APIRouter, Depends, status
from fastapi.security import HTTPBearer
from typing import Annotated, List

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.review_session_department.review_session_department_schema import (
    ReviewSessionDepartment as ReviewSessionDepartmentSchema,
    ReviewSessionDepartmentCreate,
)
from backend.api_v1.review_session_department.review_session_department_dependencies import (
    get_review_session_department_service,
)
from backend.api_v1.review_session_department.review_session_department_service import (
    ReviewSessionDepartmentService,
)

router = APIRouter(
    prefix="/review_sessions",
    tags=["Review Session Departments"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get(
    "/{session_id}/departments",
    response_model=List[ReviewSessionDepartmentSchema],
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
