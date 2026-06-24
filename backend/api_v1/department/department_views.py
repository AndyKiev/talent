from fastapi import APIRouter, Depends, status, Query
from fastapi.security import HTTPBearer
from typing import Annotated, Optional, List

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.department.department_schema import (
    Department as DepartmentSchema,
    DepartmentFlat,
    DepartmentCreate,
    DepartmentUpdate,
    DepartmentSubtreeGenerateResult,
    DepartmentTopResolution,
)
from backend.api_v1.department.department_dependencies import (
    get_department_service,
    department_by_id,
)
from backend.api_v1.department.department_service import DepartmentService
from backend.auth.guards import Guard
from backend.utils.enums import OperationVerb, EssenceName

router = APIRouter(
    prefix="/departments",
    tags=["Departments"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get(
    "",
    response_model=List[DepartmentFlat],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.DEPARTMENT)],
)
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


@router.get(
    "/tree",
    response_model=List[DepartmentSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.DEPARTMENT)],
)
async def get_department_tree(
    service: Annotated[DepartmentService, Depends(get_department_service)],
):
    """
    Full organigram tree — returns root departments with their complete
    nested subtree (children → grandchildren → … up to any depth).
    """
    return await service.get_tree()


@router.get(
    "/roots",
    response_model=List[DepartmentFlat],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.DEPARTMENT)],
)
async def get_root_departments(
    service: Annotated[DepartmentService, Depends(get_department_service)],
):
    """
    Flat list of root departments (parent_id IS NULL).
    Used by the frontend to decide whether the 'Add Root Department'
    button should be shown (hidden once a root exists).
    """
    return await service.get_root_departments()


@router.get(
    "/top_org_units",
    response_model=List[DepartmentTopResolution],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.DEPARTMENT)],
)
async def get_top_org_units(
    service: Annotated[DepartmentService, Depends(get_department_service)],
    ids: str = Query(..., description="Comma-separated department ids"),
):
    """
    Resolve each department id to its top-level org unit (board / directorate /
    store) by walking up the tree. Static path — declared BEFORE /{department_id}
    so it is not captured by the dynamic id route.
    """
    id_list = [int(x) for x in ids.split(",") if x.strip()]
    return await service.resolve_top_org_units(id_list)


@router.get(
    "/{department_id}/tree",
    response_model=DepartmentSchema,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.DEPARTMENT)],
)
async def get_department_subtree(
    department_id: int,
    service: Annotated[DepartmentService, Depends(get_department_service)],
):
    """Full subtree rooted at department_id."""
    return await service.get_department_tree_node(department_id)


@router.post(
    "/{department_id}/generate_subtree",
    response_model=DepartmentSubtreeGenerateResult,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.CREATE, EssenceName.DEPARTMENT)],
)
async def generate_department_subtree(
    department_id: int,
    service: Annotated[DepartmentService, Depends(get_department_service)],
):
    """
    Recursively create missing department instances below `department_id`,
    following the department-TYPE parental graph (active links only).

    For each child type of the current node's type: if a direct child of that
    type already exists it is reused (and descended into), otherwise a new
    department is created (name = type name, category resolved from the root's
    category key). Runs in a single transaction. Idempotent.
    """
    return await service.generate_subtree(department_id)


@router.get(
    "/{department_id}",
    response_model=DepartmentSchema,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.DEPARTMENT)],
)
async def get_department(
    department_id: int,
    service: Annotated[DepartmentService, Depends(get_department_service)],
):
    return await service.get_department_tree_node(department_id)


@router.post(
    "",
    response_model=MutationResponse[DepartmentSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.CREATE, EssenceName.DEPARTMENT)],
)
async def create_department(
    dept_in: DepartmentCreate,
    service: Annotated[DepartmentService, Depends(get_department_service)],
):
    return await service.create_department(dept_in)


@router.patch(
    "/{department_id}",
    response_model=MutationResponse[DepartmentSchema],
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.DEPARTMENT)],
)
async def update_department(
    department_id: int,
    dept_update: DepartmentUpdate,
    service: Annotated[DepartmentService, Depends(get_department_service)],
):
    return await service.update_department(department_id, dept_update)


@router.delete(
    "/{department_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.DELETE, EssenceName.DEPARTMENT)],
)
async def delete_department(
    department_id: int,
    service: Annotated[DepartmentService, Depends(get_department_service)],
):
    await service.delete_department(department_id)
