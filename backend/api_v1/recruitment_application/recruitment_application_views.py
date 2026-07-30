from typing import Annotated

from fastapi import APIRouter, Depends, status

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.recruitment_application.recruitment_application_dependencies import (
    candidate_application_by_id,
    get_candidate_application_service,
)
from backend.api_v1.recruitment_application.recruitment_application_schema import (
    RecruitmentApplicationCreate,
    RecruitmentApplicationSchema,
    RecruitmentApplicationStatusChange,
)
from backend.api_v1.recruitment_application.recruitment_application_service import (
    RecruitmentApplicationService,
)
from backend.auth.guards import Guard
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.utils.enums import EssenceName, OperationVerb

router = APIRouter(
    prefix="/recruitment_applications",
    tags=["RecruitmentCandidate Applications"],
    dependencies=[Depends(get_current_active_auth_user)],
)


@router.get(
    "",
    response_model=list[RecruitmentApplicationSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.RECRUITMENT_APPLICATION)],
)
async def get_recruitment_applications(
    service: Annotated[
        RecruitmentApplicationService, Depends(get_candidate_application_service)
    ],
    candidate_id: int | None = None,
    recruitment_task_id: int | None = None,
):
    return await service.get_recruitment_applications(
        candidate_id=candidate_id, recruitment_task_id=recruitment_task_id
    )


@router.get(
    "/{candidate_application_id}",
    response_model=RecruitmentApplicationSchema,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.RECRUITMENT_APPLICATION)],
)
async def get_candidate_application(
    candidate_application_id: int,
    service: Annotated[
        RecruitmentApplicationService, Depends(get_candidate_application_service)
    ],
):
    return await service.get_application_detail(candidate_application_id)


@router.post(
    "",
    response_model=MutationResponse[RecruitmentApplicationSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.CREATE, EssenceName.RECRUITMENT_APPLICATION)],
)
async def create_candidate_application(
    app_in: RecruitmentApplicationCreate,
    service: Annotated[
        RecruitmentApplicationService, Depends(get_candidate_application_service)
    ],
):
    return await service.create_candidate_application(app_in)


@router.post(
    "/{candidate_application_id}/status",
    response_model=MutationResponse[RecruitmentApplicationSchema],
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.RECRUITMENT_APPLICATION)],
)
async def change_candidate_application_status(
    status_change: RecruitmentApplicationStatusChange,
    record: RecruitmentApplicationSchema = Depends(candidate_application_by_id),
    service: Annotated[
        RecruitmentApplicationService, Depends(get_candidate_application_service)
    ] = None,
):
    return await service.change_status(record.id, status_change.status_key)


@router.delete(
    "/{candidate_application_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.DELETE, EssenceName.RECRUITMENT_APPLICATION)],
)
async def delete_candidate_application(
    candidate_application_id: int,
    service: Annotated[
        RecruitmentApplicationService, Depends(get_candidate_application_service)
    ],
):
    await service.delete_candidate_application(candidate_application_id)
