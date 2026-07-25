from typing import Annotated

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee_training_status.employee_training_status_dependencies import (
    employee_training_status_by_id,
    get_employee_training_status_service,
)
from backend.api_v1.employee_training_status.employee_training_status_schema import (
    EmployeeTrainingStatus as EmployeeTrainingStatusSchema,
)
from backend.api_v1.employee_training_status.employee_training_status_schema import (
    EmployeeTrainingStatusCreate,
    EmployeeTrainingStatusUpdate,
)
from backend.api_v1.employee_training_status.employee_training_status_service import (
    EmployeeTrainingStatusService,
)
from backend.auth.guards import Guard
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.utils.enums import EssenceName, OperationVerb
from fastapi import APIRouter, Depends, status
from fastapi.security import HTTPBearer

router = APIRouter(
    prefix="/employee_training_statuses",
    tags=["Employee Training Statuses"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get(
    "",
    response_model=list[EmployeeTrainingStatusSchema],
    # Auth-only, like the other people-review catalog lookups (review levels /
    # dimensions / language levels): a harmless status enum that the evaluation
    # page needs to render training-status labels for any authenticated user.
    dependencies=[Depends(get_current_active_auth_user)],
)
async def get_employee_training_statuses(
    service: Annotated[EmployeeTrainingStatusService, Depends(get_employee_training_status_service)],
):
    return await service.get_employee_training_statuses()


@router.get(
    "/{employee_training_status_id}",
    response_model=EmployeeTrainingStatusSchema,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.EMPLOYEE_TRAINING_STATUS)],
)
async def get_employee_training_status(
    record: EmployeeTrainingStatusSchema = Depends(employee_training_status_by_id),
):
    return record


@router.post(
    "",
    response_model=MutationResponse[EmployeeTrainingStatusSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.CREATE, EssenceName.EMPLOYEE_TRAINING_STATUS)],
)
async def create_employee_training_status(
    data: EmployeeTrainingStatusCreate,
    service: Annotated[EmployeeTrainingStatusService, Depends(get_employee_training_status_service)],
):
    return await service.create_employee_training_status(data)


@router.patch(
    "/{employee_training_status_id}",
    response_model=MutationResponse[EmployeeTrainingStatusSchema],
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.EMPLOYEE_TRAINING_STATUS)],
)
async def update_employee_training_status(
    data: EmployeeTrainingStatusUpdate,
    record: EmployeeTrainingStatusSchema = Depends(employee_training_status_by_id),
    service: Annotated[EmployeeTrainingStatusService, Depends(get_employee_training_status_service)] = None,
):
    return await service.update_employee_training_status(record.id, data)


@router.delete(
    "/{employee_training_status_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.DELETE, EssenceName.EMPLOYEE_TRAINING_STATUS)],
)
async def delete_employee_training_status(
    employee_training_status_id: int,
    service: Annotated[EmployeeTrainingStatusService, Depends(get_employee_training_status_service)],
):
    await service.delete_employee_training_status(employee_training_status_id)
