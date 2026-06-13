from fastapi import APIRouter, Depends, status, Query
from fastapi.security import HTTPBearer
from typing import Annotated, List

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee_child.employee_child_schema import (
    EmployeeChild as EmployeeChildSchema,
    EmployeeChildCreate,
)
from backend.api_v1.employee_child.employee_child_dependencies import (
    get_employee_child_service,
)
from backend.api_v1.employee_child.employee_child_service import (
    EmployeeChildService,
)

router = APIRouter(
    prefix="/employee_children",
    tags=["Employee Children"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get("", response_model=List[EmployeeChildSchema])
async def get_employee_children(
    service: Annotated[EmployeeChildService, Depends(get_employee_child_service)],
    employee_id: int = Query(..., description="List children for this employee"),
):
    return await service.list_by_employee(employee_id)


@router.post(
    "",
    response_model=MutationResponse[EmployeeChildSchema],
    status_code=status.HTTP_201_CREATED,
)
async def create_employee_child(
    child_in: EmployeeChildCreate,
    service: Annotated[EmployeeChildService, Depends(get_employee_child_service)],
):
    return await service.create_child(child_in)


@router.delete("/{employee_child_id}", status_code=status.HTTP_200_OK)
async def delete_employee_child(
    employee_child_id: int,
    service: Annotated[EmployeeChildService, Depends(get_employee_child_service)],
):
    await service.delete_child(employee_child_id)
