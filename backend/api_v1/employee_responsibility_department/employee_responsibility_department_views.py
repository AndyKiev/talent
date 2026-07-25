from typing import Annotated

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee_responsibility_department.employee_responsibility_department_dependencies import (
    get_employee_responsibility_department_service,
    responsibility_link_by_id,
)
from backend.api_v1.employee_responsibility_department.employee_responsibility_department_schema import (
    EmployeeResponsibilityDepartmentCreate,
    EmployeeResponsibilityDepartmentSchema,
    EmployeeResponsibilityDepartmentUpdate,
)
from backend.api_v1.employee_responsibility_department.employee_responsibility_department_service import (
    EmployeeResponsibilityDepartmentService,
)
from backend.auth.guards import Guard
from backend.utils.enums import EssenceName, OperationVerb
from fastapi import APIRouter, Depends, status
from fastapi.security import HTTPBearer

# All routes are nested under /employees/{employee_id}/responsibility_departments
router = APIRouter(
    prefix="/employees/{employee_id}/responsibility_departments",
    tags=["Employee Responsibility Departments"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


# ── Read ───────────────────────────────────────────────────────────────────────


@router.get(
    "",
    response_model=list[EmployeeResponsibilityDepartmentSchema],
    summary="List all responsibility assignments for an employee",
    dependencies=[
        Guard(OperationVerb.VIEW, EssenceName.EMPLOYEE, EssenceName.DEPARTMENT)
    ],
)
async def get_employee_responsibility_links(
    employee_id: int,
    service: Annotated[
        EmployeeResponsibilityDepartmentService,
        Depends(get_employee_responsibility_department_service),
    ],
):
    return await service.get_by_employee(employee_id)


@router.get(
    "/{link_id}",
    response_model=EmployeeResponsibilityDepartmentSchema,
    summary="Get a single responsibility assignment by ID",
    dependencies=[
        Guard(OperationVerb.VIEW, EssenceName.EMPLOYEE, EssenceName.DEPARTMENT)
    ],
)
async def get_employee_responsibility_link(
    record: EmployeeResponsibilityDepartmentSchema = Depends(responsibility_link_by_id),
):
    return record


# ── Write ──────────────────────────────────────────────────────────────────────


@router.post(
    "",
    response_model=MutationResponse[EmployeeResponsibilityDepartmentSchema],
    status_code=status.HTTP_201_CREATED,
    summary="Create a new responsibility assignment",
    description=(
        "Links the employee to a responsibility department. "
        "Returns 400 if the (employee, department) pair already exists."
    ),
    dependencies=[
        Guard(OperationVerb.LINK, EssenceName.EMPLOYEE, EssenceName.DEPARTMENT)
    ],
)
async def create_employee_responsibility_link(
    employee_id: int,
    link_in: EmployeeResponsibilityDepartmentCreate,
    service: Annotated[
        EmployeeResponsibilityDepartmentService,
        Depends(get_employee_responsibility_department_service),
    ],
):
    return await service.create_link(employee_id, link_in)


@router.patch(
    "/{link_id}",
    response_model=MutationResponse[EmployeeResponsibilityDepartmentSchema],
    summary="Partially update a responsibility assignment",
    dependencies=[
        Guard(OperationVerb.LINK, EssenceName.EMPLOYEE, EssenceName.DEPARTMENT)
    ],
)
async def update_employee_responsibility_link(
    link_id: int,
    link_update: EmployeeResponsibilityDepartmentUpdate,
    record: EmployeeResponsibilityDepartmentSchema = Depends(responsibility_link_by_id),
    service: Annotated[
        EmployeeResponsibilityDepartmentService,
        Depends(get_employee_responsibility_department_service),
    ] = None,
):
    return await service.update_link(record.id, record.employee_id, link_update)


@router.delete(
    "/{link_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a responsibility assignment",
    dependencies=[
        Guard(OperationVerb.LINK, EssenceName.EMPLOYEE, EssenceName.DEPARTMENT)
    ],
)
async def delete_employee_responsibility_link(
    link_id: int,
    employee_id: int,
    service: Annotated[
        EmployeeResponsibilityDepartmentService,
        Depends(get_employee_responsibility_department_service),
    ],
):
    await service.delete_link(link_id, employee_id)
