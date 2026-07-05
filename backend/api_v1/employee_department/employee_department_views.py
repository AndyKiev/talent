from fastapi import APIRouter, Depends, status
from fastapi.security import HTTPBearer
from typing import Annotated, List

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee_department.employee_department_schema import (
    EmployeeDepartmentSchema,
    EmployeeDepartmentCreate,
    EmployeeDepartmentUpdate,
)
from backend.api_v1.employee_department.employee_department_dependencies import (
    get_employee_department_service,
    link_by_id,
)
from backend.api_v1.employee_department.employee_department_service import (
    EmployeeDepartmentService,
)
from backend.auth.guards import Guard
from backend.utils.enums import OperationVerb, EssenceName

# All routes are nested under /employees/{employee_id}/departments
router = APIRouter(
    prefix="/employees/{employee_id}/departments",
    tags=["Employee Org Unit Departments"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


# ── Read ───────────────────────────────────────────────────────────────────────


@router.get(
    "",
    response_model=List[EmployeeDepartmentSchema],
    summary="List all assignments for an employee",
    dependencies=[
        Guard(OperationVerb.VIEW, EssenceName.EMPLOYEE, EssenceName.DEPARTMENT)
    ],
)
async def get_employee_links(
    employee_id: int,
    service: Annotated[
        EmployeeDepartmentService,
        Depends(get_employee_department_service),
    ],
):
    return await service.get_by_employee(employee_id)


@router.get(
    "/{link_id}",
    response_model=EmployeeDepartmentSchema,
    summary="Get a single assignment by ID",
    dependencies=[
        Guard(OperationVerb.VIEW, EssenceName.EMPLOYEE, EssenceName.DEPARTMENT)
    ],
)
async def get_employee_link(
    record: EmployeeDepartmentSchema = Depends(link_by_id),
):
    return record


# ── Write ──────────────────────────────────────────────────────────────────────


@router.post(
    "",
    response_model=MutationResponse[EmployeeDepartmentSchema],
    status_code=status.HTTP_201_CREATED,
    summary="Create the employee's main-department assignment",
    description=(
        "Links the employee to their MAIN department. "
        "Returns 400 if the employee already has a main department."
    ),
    dependencies=[
        Guard(OperationVerb.LINK, EssenceName.EMPLOYEE, EssenceName.DEPARTMENT)
    ],
)
async def create_employee_link(
    employee_id: int,
    link_in: EmployeeDepartmentCreate,
    service: Annotated[
        EmployeeDepartmentService,
        Depends(get_employee_department_service),
    ],
):
    return await service.create_link(employee_id, link_in)


@router.patch(
    "/{link_id}",
    response_model=MutationResponse[EmployeeDepartmentSchema],
    summary="Partially update an assignment",
    description="Change the department of the existing main link.",
    dependencies=[
        Guard(OperationVerb.LINK, EssenceName.EMPLOYEE, EssenceName.DEPARTMENT)
    ],
)
async def update_employee_link(
    link_id: int,
    link_update: EmployeeDepartmentUpdate,
    record: EmployeeDepartmentSchema = Depends(link_by_id),
    service: Annotated[
        EmployeeDepartmentService,
        Depends(get_employee_department_service),
    ] = None,
):
    return await service.update_link(record.id, record.employee_id, link_update)


@router.delete(
    "/{link_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete an assignment",
    dependencies=[
        Guard(OperationVerb.LINK, EssenceName.EMPLOYEE, EssenceName.DEPARTMENT)
    ],
)
async def delete_employee_link(
    link_id: int,
    employee_id: int,
    service: Annotated[
        EmployeeDepartmentService,
        Depends(get_employee_department_service),
    ],
):
    await service.delete_link(link_id, employee_id)
