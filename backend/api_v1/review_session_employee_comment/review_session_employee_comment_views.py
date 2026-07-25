from typing import Annotated

from fastapi import APIRouter, Depends, status

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.review_session_employee_comment.review_session_employee_comment_dependencies import (
    get_review_session_employee_comment_service,
)
from backend.api_v1.review_session_employee_comment.review_session_employee_comment_schema import (
    ReviewCommentCreate,
    ReviewCommentSchema,
    ReviewCommentUpdate,
)
from backend.api_v1.review_session_employee_comment.review_session_employee_comment_service import (
    ReviewSessionEmployeeCommentService,
)
from backend.auth.jwt_auth import get_current_active_auth_user

# Mounted under the review_session_employees namespace: a comment is a sub-resource
# of a single per-employee review record (rse_id). Many comments per rse.
router = APIRouter(
    prefix="/review_session_employees",
    tags=["Review Session Employee Comments"],
    dependencies=[Depends(get_current_active_auth_user)],
)


@router.get(
    "/{rse_id}/comments",
    response_model=list[ReviewCommentSchema],
)
async def list_review_comments(
    rse_id: int,
    service: Annotated[
        ReviewSessionEmployeeCommentService,
        Depends(get_review_session_employee_comment_service),
    ],
):
    return await service.list_comments(rse_id)


@router.post(
    "/{rse_id}/comments",
    response_model=MutationResponse[ReviewCommentSchema],
    status_code=status.HTTP_201_CREATED,
)
async def create_review_comment(
    rse_id: int,
    payload: ReviewCommentCreate,
    service: Annotated[
        ReviewSessionEmployeeCommentService,
        Depends(get_review_session_employee_comment_service),
    ],
):
    return await service.create_comment(rse_id, payload)


@router.patch(
    "/{rse_id}/comments/{comment_id}",
    response_model=MutationResponse[ReviewCommentSchema],
)
async def update_review_comment(
    rse_id: int,
    comment_id: int,
    payload: ReviewCommentUpdate,
    service: Annotated[
        ReviewSessionEmployeeCommentService,
        Depends(get_review_session_employee_comment_service),
    ],
):
    return await service.update_comment(rse_id, comment_id, payload)


@router.delete(
    "/{rse_id}/comments/{comment_id}",
    response_model=MutationResponse[None],
)
async def delete_review_comment(
    rse_id: int,
    comment_id: int,
    service: Annotated[
        ReviewSessionEmployeeCommentService,
        Depends(get_review_session_employee_comment_service),
    ],
):
    return await service.delete_comment(rse_id, comment_id)
