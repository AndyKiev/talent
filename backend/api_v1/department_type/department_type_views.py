from fastapi import APIRouter, Depends, status, Query
from fastapi.security import HTTPBearer
from typing import Annotated, Optional, List

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.department_type.department_type_schema import (
    DepartmentType as DepartmentTypeSchema,
    DepartmentTypeCreate,
    DepartmentTypeUpdate, DepartmentTypeWithParentalLink,
)
from backend.api_v1.department_type.department_type_dependencies import (
    get_department_type_service,
    department_type_by_id,
)
from backend.api_v1.department_type.department_type_service import DepartmentTypeService

router = APIRouter(
    prefix="/admin/department_types",
    tags=["Department Types"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get("", response_model=List[DepartmentTypeSchema])
async def get_department_types(
    service: Annotated[DepartmentTypeService, Depends(get_department_type_service)],
    name: Optional[str] = None,
    is_active: Optional[bool] = None,
    sort: Optional[str] = Query(None, description='JSON: {"field": "asc|desc"}'),
):
    return await service.get_department_types(name=name, is_active=is_active, sort=sort)


@router.get("/{department_type_id}", response_model=DepartmentTypeSchema)
async def get_department_type(
    record: DepartmentTypeSchema = Depends(department_type_by_id),
):
    return record


@router.post(
    "",
    response_model=MutationResponse[DepartmentTypeSchema],
    status_code=status.HTTP_201_CREATED,
)
async def create_department_type(
    type_in: DepartmentTypeCreate,
    service: Annotated[DepartmentTypeService, Depends(get_department_type_service)],
):
    return await service.create_department_type(type_in)


@router.patch(
    "/{department_type_id}",
    response_model=MutationResponse[DepartmentTypeSchema],
)
async def update_department_type(
    type_update: DepartmentTypeUpdate,
    record: DepartmentTypeSchema = Depends(department_type_by_id),
    service: Annotated[DepartmentTypeService, Depends(get_department_type_service)] = None,
):
    return await service.update_department_type(record.id, type_update)


@router.delete("/{department_type_id}", status_code=status.HTTP_200_OK)
async def delete_department_type(
    department_type_id: int,
    service: Annotated[DepartmentTypeService, Depends(get_department_type_service)],
):
    await service.delete_department_type(department_type_id)


@router.get(
    "/{department_type_id}/children",
    response_model=List[DepartmentTypeWithParentalLink],
)
async def get_children_by_parent(
    department_type_id: int,
    service: Annotated[DepartmentTypeService, Depends(get_department_type_service)],
    is_active: Optional[bool] = None,
    sort: Optional[str] = Query(None, description='JSON: {"field": "asc|desc"}'),
):
    """Get all child department types for a given parent ID, with link metadata"""
    return await service.get_children_by_parent(
        parent_id=department_type_id,
        is_active=is_active,
        sort=sort,
    )