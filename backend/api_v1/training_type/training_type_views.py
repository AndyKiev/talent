from fastapi import APIRouter, Depends, status
from fastapi.security import HTTPBearer
from typing import Annotated, List

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.training_type.training_type_schema import (
    TrainingType as TrainingTypeSchema,
    TrainingTypeCreate,
    TrainingTypeUpdate,
)
from backend.api_v1.training_type.training_type_dependencies import (
    get_training_type_service,
    training_type_by_id,
)
from backend.api_v1.training_type.training_type_service import TrainingTypeService
from backend.auth.guards import Guard
from backend.api_v1.review_session_employee.people_review_access import (
    PeopleReviewScopedGuard,
)
from backend.utils.enums import OperationVerb, EssenceName

router = APIRouter(
    prefix="/training_types",
    tags=["Training Types"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get(
    "",
    response_model=List[TrainingTypeSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.TRAINING_TYPE)],
)
async def get_training_types(
    service: Annotated[TrainingTypeService, Depends(get_training_type_service)],
):
    return await service.get_training_types()


@router.get(
    "/eligible/{employee_id}",
    response_model=List[TrainingTypeSchema],
    # Admin VIEW grant OR the employee is within the caller's people-review
    # scope — the self-reviewer's evaluation page lists their eligible trainings.
    dependencies=[
        PeopleReviewScopedGuard(OperationVerb.VIEW, EssenceName.TRAINING_TYPE)
    ],
)
async def get_eligible_training_types(
    employee_id: int,
    service: Annotated[TrainingTypeService, Depends(get_training_type_service)],
):
    return await service.get_eligible_for_employee(employee_id)


@router.get(
    "/{training_type_id}",
    response_model=TrainingTypeSchema,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.TRAINING_TYPE)],
)
async def get_training_type(
    record: TrainingTypeSchema = Depends(training_type_by_id),
):
    return record


@router.post(
    "",
    response_model=MutationResponse[TrainingTypeSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.CREATE, EssenceName.TRAINING_TYPE)],
)
async def create_training_type(
    data: TrainingTypeCreate,
    service: Annotated[TrainingTypeService, Depends(get_training_type_service)],
):
    return await service.create_training_type(data)


@router.patch(
    "/{training_type_id}",
    response_model=MutationResponse[TrainingTypeSchema],
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.TRAINING_TYPE)],
)
async def update_training_type(
    data: TrainingTypeUpdate,
    record: TrainingTypeSchema = Depends(training_type_by_id),
    service: Annotated[TrainingTypeService, Depends(get_training_type_service)] = None,
):
    return await service.update_training_type(record.id, data)


@router.delete(
    "/{training_type_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.DELETE, EssenceName.TRAINING_TYPE)],
)
async def delete_training_type(
    training_type_id: int,
    service: Annotated[TrainingTypeService, Depends(get_training_type_service)],
):
    await service.delete_training_type(training_type_id)
