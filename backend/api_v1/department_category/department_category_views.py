from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from fastapi.security import HTTPBearer

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.department_category.department_category_dependencies import (
    department_category_by_id,
    get_department_category_service,
)
from backend.api_v1.department_category.department_category_schema import (
    DepartmentCategory as DepartmentCategorySchema,
)
from backend.api_v1.department_category.department_category_schema import (
    DepartmentCategoryCreate,
    DepartmentCategoryUpdate,
)
from backend.api_v1.department_category.department_category_service import (
    DepartmentCategoryService,
)
from backend.auth.guards import Guard
from backend.utils.enums import EssenceName, OperationVerb

router = APIRouter(
    prefix="/admin/department_categories",
    tags=["Department Categories"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get(
    "",
    response_model=list[DepartmentCategorySchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.DEPARTMENT_CATEGORY)],
)
async def get_department_categories(
    service: Annotated[
        DepartmentCategoryService, Depends(get_department_category_service)
    ],
    name: str | None = None,
    is_active: bool | None = None,
    is_main: bool | None = None,
    is_responsibility: bool | None = None,
    sort: str | None = Query(None, description='JSON: {"field": "asc|desc"}'),
):
    return await service.get_department_categories(
        name=name,
        is_active=is_active,
        is_main=is_main,
        is_responsibility=is_responsibility,
        sort=sort,
    )


@router.get(
    "/{department_category_id}",
    response_model=DepartmentCategorySchema,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.DEPARTMENT_CATEGORY)],
)
async def get_department_category(
    record: DepartmentCategorySchema = Depends(department_category_by_id),
):
    return record


@router.post(
    "",
    response_model=MutationResponse[DepartmentCategorySchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.CREATE, EssenceName.DEPARTMENT_CATEGORY)],
)
async def create_department_category(
    category_in: DepartmentCategoryCreate,
    service: Annotated[
        DepartmentCategoryService, Depends(get_department_category_service)
    ],
):
    return await service.create_department_category(category_in)


@router.patch(
    "/{department_category_id}",
    response_model=MutationResponse[DepartmentCategorySchema],
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.DEPARTMENT_CATEGORY)],
)
async def update_department_category(
    category_update: DepartmentCategoryUpdate,
    record: DepartmentCategorySchema = Depends(department_category_by_id),
    service: Annotated[
        DepartmentCategoryService, Depends(get_department_category_service)
    ] = None,
):
    return await service.update_department_category(record.id, category_update)


@router.delete(
    "/{department_category_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.DELETE, EssenceName.DEPARTMENT_CATEGORY)],
)
async def delete_department_category(
    department_category_id: int,
    service: Annotated[
        DepartmentCategoryService, Depends(get_department_category_service)
    ],
):
    await service.delete_department_category(department_category_id)
