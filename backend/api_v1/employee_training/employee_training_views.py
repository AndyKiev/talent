from fastapi import APIRouter, Depends, status
from fastapi.security import HTTPBearer
from typing import Annotated, List

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee_training.employee_training_model import (
    EmployeeTraining as EmployeeTrainingModel,
)
from backend.api_v1.employee_training.employee_training_schema import (
    EmployeeTraining as EmployeeTrainingSchema,
    EmployeeTrainingCreate,
    EmployeeTrainingUpdate,
    TrainingStateRow,
)
from backend.api_v1.employee_training.employee_training_dependencies import (
    get_employee_training_service,
    employee_training_by_id,
)
from backend.api_v1.employee_training.employee_training_service import (
    EmployeeTrainingService,
)
from backend.auth.guards import Guard
from backend.utils.enums import OperationVerb, EssenceName

router = APIRouter(
    prefix="/employee_trainings",
    tags=["Employee Trainings"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get(
    "/employee/{employee_id}",
    response_model=List[EmployeeTrainingSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.EMPLOYEE_TRAINING)],
)
async def get_employee_trainings(
    employee_id: int,
    service: Annotated[EmployeeTrainingService, Depends(get_employee_training_service)],
):
    return await service.get_for_employee(employee_id)


@router.get(
    "/state",
    response_model=List[TrainingStateRow],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.EMPLOYEE_TRAINING)],
)
async def get_training_state(
    training_type_id: int,
    service: Annotated[EmployeeTrainingService, Depends(get_employee_training_service)],
):
    return await service.get_training_state(training_type_id)


@router.post(
    "",
    response_model=MutationResponse[EmployeeTrainingSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.ASSIGN, EssenceName.EMPLOYEE_TRAINING)],
)
async def create_employee_training(
    data: EmployeeTrainingCreate,
    service: Annotated[EmployeeTrainingService, Depends(get_employee_training_service)],
):
    return await service.create_employee_training(data)


@router.patch(
    "/{employee_training_id}",
    response_model=MutationResponse[EmployeeTrainingSchema],
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.EMPLOYEE_TRAINING)],
)
async def update_employee_training(
    data: EmployeeTrainingUpdate,
    record: EmployeeTrainingModel = Depends(employee_training_by_id),
    service: Annotated[EmployeeTrainingService, Depends(get_employee_training_service)] = None,
):
    return await service.update_employee_training(record.id, data)


@router.delete(
    "/{employee_training_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.DELETE, EssenceName.EMPLOYEE_TRAINING)],
)
async def delete_employee_training(
    service: Annotated[EmployeeTrainingService, Depends(get_employee_training_service)],
    record: EmployeeTrainingModel = Depends(employee_training_by_id),
):
    await service.delete_employee_training(record.id)
