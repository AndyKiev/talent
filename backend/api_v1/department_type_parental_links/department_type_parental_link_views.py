from fastapi import APIRouter, Depends, status, Query
from fastapi.security import HTTPBearer
from typing import Annotated, Optional, List
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.department_type_parental_links.department_type_parental_link_schema import (
    DepartmentTypeParentalLink as DepartmentTypeParentalLinkSchema,
    DepartmentTypeParentalLinkCreate,
    DepartmentTypeParentalLinkUpdate,
)
from backend.api_v1.department_type_parental_links.department_type_parental_link_dependencies import (
    get_department_type_parental_link_service,
    get_link_by_id,
)
from backend.api_v1.department_type_parental_links.department_type_parental_link_service import (
    DepartmentTypeParentalLinkService,
)
from backend.auth.guards import Guard
from backend.utils.enums import OperationVerb, EssenceName

router = APIRouter(
    prefix="/admin/department_type_parental_links",
    tags=["Department Type Parental Links"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get(
    "",
    response_model=List[DepartmentTypeParentalLinkSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.DEPARTMENT_TYPE)],
)
async def get_links(
    service: Annotated[
        DepartmentTypeParentalLinkService,
        Depends(get_department_type_parental_link_service),
    ],
    child_id: Optional[int] = None,
    parent_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    sort: Optional[str] = Query(None, description='JSON: {"field": "asc|desc"}'),
):
    return await service.get_links(
        child_id=child_id, parent_id=parent_id, is_active=is_active, sort=sort
    )


# NOTE: declared before "/{link_id}" so the literal segment isn't parsed as an id.
@router.get(
    "/child_map",
    response_model=dict[int, List[int]],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.DEPARTMENT_TYPE)],
)
async def get_child_map(
    service: Annotated[
        DepartmentTypeParentalLinkService,
        Depends(get_department_type_parental_link_service),
    ],
):
    return await service.get_child_map()


@router.get(
    "/{link_id}",
    response_model=DepartmentTypeParentalLinkSchema,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.DEPARTMENT_TYPE)],
)
async def get_link(
    record: DepartmentTypeParentalLinkSchema = Depends(get_link_by_id),
):
    return record


@router.post(
    "",
    response_model=MutationResponse[DepartmentTypeParentalLinkSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.LINK, EssenceName.DEPARTMENT_TYPE)],
)
async def create_link(
    link_in: DepartmentTypeParentalLinkCreate,
    service: Annotated[
        DepartmentTypeParentalLinkService,
        Depends(get_department_type_parental_link_service),
    ],
):
    return await service.create_link(link_in)


@router.patch(
    "/{link_id}",
    response_model=MutationResponse[DepartmentTypeParentalLinkSchema],
    dependencies=[Guard(OperationVerb.LINK, EssenceName.DEPARTMENT_TYPE)],
)
async def update_link(
    link_update: DepartmentTypeParentalLinkUpdate,
    record: DepartmentTypeParentalLinkSchema = Depends(get_link_by_id),
    service: Annotated[
        DepartmentTypeParentalLinkService,
        Depends(get_department_type_parental_link_service),
    ] = None,
):
    return await service.update_link(record.id, link_update)


@router.delete(
    "/{link_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.LINK, EssenceName.DEPARTMENT_TYPE)],
)
async def delete_link(
    link_id: int,
    service: Annotated[
        DepartmentTypeParentalLinkService,
        Depends(get_department_type_parental_link_service),
    ],
):
    await service.delete_link(link_id)
