from typing import Annotated

from fastapi import APIRouter, Depends, Query

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee_fact.employee_fact_dependencies import (
    get_employee_fact_service,
)
from backend.api_v1.employee_fact.employee_fact_schema import (
    EmployeeFact as EmployeeFactSchema,
)
from backend.api_v1.employee_fact.employee_fact_schema import (
    EmployeeFactCreate,
    EmployeeFactLink,
    EmployeeFactReorder,
    EmployeeFactUpdate,
)
from backend.api_v1.employee_fact.employee_fact_service import EmployeeFactService
from backend.auth.jwt_auth import get_current_active_auth_user

router = APIRouter(
    prefix="/employee_facts",
    tags=["Employee Facts"],
    dependencies=[Depends(get_current_active_auth_user)],
)

ServiceDep = Annotated[EmployeeFactService, Depends(get_employee_fact_service)]


@router.get("/unlinked", response_model=list[EmployeeFactSchema])
async def get_unlinked_facts(
    service: ServiceDep,
    employee_id: int = Query(...),
):
    """The employee's facts that are not attached to any competence yet. The
    frontend badge is this list's length."""
    return await service.get_unlinked(employee_id)


@router.post("", response_model=MutationResponse[EmployeeFactSchema])
async def create_fact(payload: EmployeeFactCreate, service: ServiceDep):
    return await service.create_fact(payload)


@router.patch("/{fact_id}", response_model=MutationResponse[EmployeeFactSchema])
async def update_fact(fact_id: int, payload: EmployeeFactUpdate, service: ServiceDep):
    return await service.update_fact(fact_id, payload)


@router.delete("/{fact_id}", response_model=MutationResponse[None])
async def delete_fact(fact_id: int, service: ServiceDep):
    return await service.delete_fact(fact_id)


@router.post("/{fact_id}/link", response_model=MutationResponse[EmployeeFactSchema])
async def link_fact(fact_id: int, payload: EmployeeFactLink, service: ServiceDep):
    return await service.link_fact(fact_id, payload)


@router.post("/{fact_id}/unlink", response_model=MutationResponse[EmployeeFactSchema])
async def unlink_fact(fact_id: int, service: ServiceDep):
    return await service.unlink_fact(fact_id)


@router.post("/reorder", response_model=MutationResponse[list[EmployeeFactSchema]])
async def reorder_facts(payload: EmployeeFactReorder, service: ServiceDep):
    return await service.reorder(payload)
