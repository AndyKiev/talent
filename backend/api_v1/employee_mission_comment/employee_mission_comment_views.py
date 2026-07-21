from typing import Annotated, List

from fastapi import APIRouter, Depends
from fastapi.security import HTTPBearer

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee_mission.employee_mission_schema import (
    EmployeeMissionCommentSchema,
)
from backend.api_v1.employee_mission_comment.employee_mission_comment_dependencies import (
    get_employee_mission_comment_service,
)
from backend.api_v1.employee_mission_comment.employee_mission_comment_schema import (
    EmployeeMissionCommentCreate,
    EmployeeMissionCommentUpdate,
)
from backend.api_v1.employee_mission_comment.employee_mission_comment_service import (
    EmployeeMissionCommentService,
)

router = APIRouter(
    prefix="/employee_mission_comments",
    tags=["Employee Mission Comments"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)

# Keyed by mission_id / comment_id, so no route Guard could be used: none of
# these paths carries an {employee_id} for PeopleReviewScopedGuard to read. The
# service resolves the owning employee first, then gates — assert_can_read for
# the GET, assert_can_author / assert_owns_comment for the writes. The GET needs
# its own check precisely because it is reachable independently of the mission
# list, and mission ids are guessable.


@router.get(
    "/mission/{mission_id}",
    response_model=List[EmployeeMissionCommentSchema],
)
async def get_comments_for_mission(
    mission_id: int,
    service: Annotated[
        EmployeeMissionCommentService, Depends(get_employee_mission_comment_service)
    ],
):
    return await service.get_for_mission(mission_id)


@router.post(
    "/mission/{mission_id}",
    response_model=MutationResponse[EmployeeMissionCommentSchema],
)
async def create_comment(
    mission_id: int,
    payload: EmployeeMissionCommentCreate,
    service: Annotated[
        EmployeeMissionCommentService, Depends(get_employee_mission_comment_service)
    ],
):
    """The mission's own employee (or admin/dev) adds a comment."""
    return await service.create_comment(mission_id, payload)


@router.patch(
    "/{comment_id}",
    response_model=MutationResponse[EmployeeMissionCommentSchema],
)
async def update_comment(
    comment_id: int,
    payload: EmployeeMissionCommentUpdate,
    service: Annotated[
        EmployeeMissionCommentService, Depends(get_employee_mission_comment_service)
    ],
):
    """Only the comment's author (or admin/dev)."""
    return await service.update_comment(comment_id, payload)


@router.delete("/{comment_id}")
async def delete_comment(
    comment_id: int,
    service: Annotated[
        EmployeeMissionCommentService, Depends(get_employee_mission_comment_service)
    ],
):
    """Only the comment's author (or admin/dev)."""
    return {"detail": await service.delete_comment(comment_id)}
