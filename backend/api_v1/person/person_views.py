from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from fastapi.security import HTTPBearer

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.person.person_dependencies import (
    get_person_service,
    person_by_id,
)
from backend.api_v1.person.person_schema import (
    PersonCheckNameResponse,
    PersonCreate,
    PersonSchema,
    PersonUpdate,
)
from backend.api_v1.person.person_service import PersonService
from backend.auth.guards import Guard
from backend.utils.enums import EssenceName, OperationVerb

router = APIRouter(
    prefix="/persons",
    tags=["Persons"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get(
    "",
    response_model=list[PersonSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.PERSON)],
)
async def get_persons(
    service: Annotated[PersonService, Depends(get_person_service)],
    sort: str | None = Query(None, description='JSON: {"field": "asc|desc"}'),
):
    return await service.get_persons(sort=sort)


@router.get(
    "/check_name",
    response_model=PersonCheckNameResponse,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.PERSON)],
)
async def check_person_name(
    service: Annotated[PersonService, Depends(get_person_service)],
    first_name: str = Query(..., max_length=64),
    last_name: str = Query(..., max_length=64),
):
    """Pre-check for the employee-create dialog: existing persons with the same
    (last, first) pair plus their employees' job & department for the modal."""
    return await service.check_name(first_name, last_name)


@router.get(
    "/by_employee/{employee_id}",
    response_model=PersonSchema,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.PERSON)],
)
async def get_person_by_employee_id(
    employee_id: int,
    service: Annotated[PersonService, Depends(get_person_service)],
):
    return await service.get_by_employee_id(employee_id)


@router.get(
    "/by_employee_code/{employee_code}",
    response_model=PersonSchema,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.PERSON)],
)
async def get_person_by_employee_code(
    employee_code: str,
    service: Annotated[PersonService, Depends(get_person_service)],
):
    return await service.get_by_employee_code(employee_code)


@router.get(
    "/{person_id}",
    response_model=PersonSchema,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.PERSON)],
)
async def get_person(record: PersonSchema = Depends(person_by_id)):
    return record


@router.post(
    "",
    response_model=MutationResponse[PersonSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.CREATE, EssenceName.PERSON)],
)
async def create_person(
    person_in: PersonCreate,
    service: Annotated[PersonService, Depends(get_person_service)],
):
    return await service.create_person(person_in)


@router.patch(
    "/{person_id}",
    response_model=MutationResponse[PersonSchema],
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.PERSON)],
)
async def update_person(
    person_update: PersonUpdate,
    record: PersonSchema = Depends(person_by_id),
    service: Annotated[PersonService, Depends(get_person_service)] = None,
):
    return await service.update_person(record.id, person_update)


@router.delete(
    "/{person_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.DELETE, EssenceName.PERSON)],
)
async def delete_person(
    person_id: int,
    service: Annotated[PersonService, Depends(get_person_service)],
):
    await service.delete_person(person_id)
