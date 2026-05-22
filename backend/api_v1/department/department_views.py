from fastapi import APIRouter, Depends, status, Query
from fastapi.security import HTTPBearer
from typing import Annotated, Optional, List

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.department.department_schema import (
    Department as DepartmentSchema,
    DepartmentFlat,
    DepartmentCreate,
    DepartmentUpdate,
)
from backend.api_v1.department.department_dependencies import (
    get_department_service,
    department_by_id,
)
from backend.api_v1.department.department_service import DepartmentService

router = APIRouter(
    prefix="/departments",
    tags=["Departments"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get("", response_model=List[DepartmentFlat])
async def get_departments(
    service: Annotated[DepartmentService, Depends(get_department_service)],
    name: Optional[str] = None,
    is_active: Optional[bool] = None,
    department_type_id: Optional[int] = None,
    department_category_id: Optional[int] = None,
    sort: Optional[str] = Query(None, description='JSON: {"field": "asc|desc"}'),
):
    """Flat list of all departments — for grids and selects."""
    return await service.get_departments(
        name=name,
        is_active=is_active,
        department_type_id=department_type_id,
        department_category_id=department_category_id,
        sort=sort,
    )


@router.get("/tree", response_model=List[DepartmentSchema])
async def get_department_tree(
    service: Annotated[DepartmentService, Depends(get_department_service)],
):
    """
    Full organigram tree — returns root departments with their complete
    nested subtree (children → grandchildren → … up to any depth).
    """
    return await service.get_tree()


@router.get("/roots", response_model=List[DepartmentFlat])
async def get_root_departments(
    service: Annotated[DepartmentService, Depends(get_department_service)],
):
    """
    Flat list of root departments (parent_id IS NULL).
    Used by the frontend to decide whether the 'Add Root Department'
    button should be shown (hidden once a root exists).
    """
    return await service.get_root_departments()


@router.get("/{department_id}/tree", response_model=DepartmentSchema)
async def get_department_subtree(
    department_id: int,
    service: Annotated[DepartmentService, Depends(get_department_service)],
):
    """Full subtree rooted at department_id."""
    return await service.get_department_tree_node(department_id)


@router.get("/{department_id}", response_model=DepartmentSchema)
async def get_department(
    department_id: int,
    service: Annotated[DepartmentService, Depends(get_department_service)],
):
    return await service.get_department_tree_node(department_id)


@router.post(
    "",
    response_model=MutationResponse[DepartmentSchema],
    status_code=status.HTTP_201_CREATED,
)
async def create_department(
    dept_in: DepartmentCreate,
    service: Annotated[DepartmentService, Depends(get_department_service)],
):
    return await service.create_department(dept_in)


@router.patch(
    "/{department_id}",
    response_model=MutationResponse[DepartmentSchema],
)
async def update_department(
    department_id: int,
    dept_update: DepartmentUpdate,
    service: Annotated[DepartmentService, Depends(get_department_service)],
):
    return await service.update_department(department_id, dept_update)


@router.delete("/{department_id}", status_code=status.HTTP_200_OK)
async def delete_department(
    department_id: int,
    service: Annotated[DepartmentService, Depends(get_department_service)],
):
    await service.delete_department(department_id)