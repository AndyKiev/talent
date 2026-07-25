from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee_education.employee_education_dependencies import (
    employee_education_by_id,
    get_employee_education_service,
)
from backend.api_v1.employee_education.employee_education_schema import (
    EmployeeEducation as EmployeeEducationSchema,
)
from backend.api_v1.employee_education.employee_education_schema import (
    EmployeeEducationCreate,
    EmployeeEducationUpdate,
)
from backend.api_v1.employee_education.employee_education_service import (
    EmployeeEducationService,
)
from backend.auth.jwt_auth import get_current_active_auth_user

router = APIRouter(
    prefix="/employee_educations",
    tags=["Employee Education"],
    dependencies=[Depends(get_current_active_auth_user)],
)


@router.get("", response_model=list[EmployeeEducationSchema])
async def get_employee_educations(
    service: Annotated[
        EmployeeEducationService, Depends(get_employee_education_service)
    ],
    employee_id: int = Query(
        ..., description="List education records for this employee"
    ),
):
    return await service.list_by_employee(employee_id)


@router.post(
    "",
    response_model=MutationResponse[EmployeeEducationSchema],
    status_code=status.HTTP_201_CREATED,
)
async def create_employee_education(
    education_in: EmployeeEducationCreate,
    service: Annotated[
        EmployeeEducationService, Depends(get_employee_education_service)
    ],
):
    return await service.create_education(education_in)


@router.patch(
    "/{employee_education_id}",
    response_model=MutationResponse[EmployeeEducationSchema],
)
async def update_employee_education(
    education_update: EmployeeEducationUpdate,
    record: EmployeeEducationSchema = Depends(employee_education_by_id),
    service: Annotated[
        EmployeeEducationService, Depends(get_employee_education_service)
    ] = None,
):
    return await service.update_education(record.id, education_update)


@router.delete("/{employee_education_id}", status_code=status.HTTP_200_OK)
async def delete_employee_education(
    employee_education_id: int,
    service: Annotated[
        EmployeeEducationService, Depends(get_employee_education_service)
    ],
):
    await service.delete_education(employee_education_id)
