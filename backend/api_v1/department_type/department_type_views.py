from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from fastapi.security import HTTPBearer

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.department_type.department_type_dependencies import (
    department_type_by_id,
    get_department_type_service,
)
from backend.api_v1.department_type.department_type_schema import (
    DepartmentType as DepartmentTypeSchema,
)
from backend.api_v1.department_type.department_type_schema import (
    DepartmentTypeCreate,
    DepartmentTypeUpdate,
    DepartmentTypeWithLinkStats,
    DepartmentTypeWithParentalLink,
)
from backend.api_v1.department_type.department_type_service import DepartmentTypeService
from backend.auth.guards import Guard
from backend.utils.enums import EssenceName, OperationVerb

router = APIRouter(
    prefix="/admin/department_types",
    tags=["Department Types"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get(
    "",
    response_model=list[DepartmentTypeWithLinkStats],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.DEPARTMENT_TYPE)],
)
async def get_department_types(
    service: Annotated[DepartmentTypeService, Depends(get_department_type_service)],
    name: str | None = None,
    is_active: bool | None = None,
    sort: str | None = Query(None, description='JSON: {"field": "asc|desc"}'),
):
    return await service.get_department_types(name=name, is_active=is_active, sort=sort)


@router.get(
    "/{department_type_id}",
    response_model=DepartmentTypeSchema,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.DEPARTMENT_TYPE)],
)
async def get_department_type(
    record: DepartmentTypeSchema = Depends(department_type_by_id),
):
    return record


@router.post(
    "",
    response_model=MutationResponse[DepartmentTypeSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.CREATE, EssenceName.DEPARTMENT_TYPE)],
)
async def create_department_type(
    type_in: DepartmentTypeCreate,
    service: Annotated[DepartmentTypeService, Depends(get_department_type_service)],
):
    return await service.create_department_type(type_in)


@router.patch(
    "/{department_type_id}",
    response_model=MutationResponse[DepartmentTypeSchema],
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.DEPARTMENT_TYPE)],
)
async def update_department_type(
    type_update: DepartmentTypeUpdate,
    record: DepartmentTypeSchema = Depends(department_type_by_id),
    service: Annotated[
        DepartmentTypeService, Depends(get_department_type_service)
    ] = None,
):
    return await service.update_department_type(record.id, type_update)


@router.delete(
    "/{department_type_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.DELETE, EssenceName.DEPARTMENT_TYPE)],
)
async def delete_department_type(
    department_type_id: int,
    service: Annotated[DepartmentTypeService, Depends(get_department_type_service)],
):
    await service.delete_department_type(department_type_id)


@router.get(
    "/{department_type_id}/children",
    response_model=list[DepartmentTypeWithParentalLink],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.DEPARTMENT_TYPE)],
)
async def get_children_by_parent(
    department_type_id: int,
    service: Annotated[DepartmentTypeService, Depends(get_department_type_service)],
    is_active: bool | None = None,
    sort: str | None = Query(None, description='JSON: {"field": "asc|desc"}'),
):
    """Get all child department types for a given parent ID, with link metadata"""
    return await service.get_children_by_parent(
        parent_id=department_type_id,
        is_active=is_active,
        sort=sort,
    )
