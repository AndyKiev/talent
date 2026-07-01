from fastapi import APIRouter, Depends, status
from fastapi.security import HTTPBearer
from typing import Annotated, List

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee_training_status.employee_training_status_schema import (
    EmployeeTrainingStatus as EmployeeTrainingStatusSchema,
    EmployeeTrainingStatusCreate,
    EmployeeTrainingStatusUpdate,
)
from backend.api_v1.employee_training_status.employee_training_status_dependencies import (
    get_employee_training_status_service,
    employee_training_status_by_id,
)
from backend.api_v1.employee_training_status.employee_training_status_service import (
    EmployeeTrainingStatusService,
)
from backend.auth.guards import Guard
from backend.utils.enums import OperationVerb, EssenceName

router = APIRouter(
    prefix="/employee_training_statuses",
    tags=["Employee Training Statuses"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get(
    "",
    response_model=List[EmployeeTrainingStatusSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.EMPLOYEE_TRAINING_STATUS)],
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
