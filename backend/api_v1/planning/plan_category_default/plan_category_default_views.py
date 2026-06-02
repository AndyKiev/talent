from fastapi import APIRouter, Depends, status
from fastapi.security import HTTPBearer
from typing import Annotated, List

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.planning.plan_category_default.plan_category_default_schema import (
    PlanCategoryDefault as PlanCategoryDefaultSchema,
    PlanCategoryDefaultCreate,
)
from backend.api_v1.planning.plan_category_default.plan_category_default_dependencies import (
    get_plan_category_default_service,
)
from backend.api_v1.planning.plan_category_default.plan_category_default_service import (
    PlanCategoryDefaultService,
)

router = APIRouter(
    prefix="/admin/plan_category_defaults",
    tags=["Plan Category Defaults"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get("", response_model=List[PlanCategoryDefaultSchema])
async def get_plan_category_defaults(
    service: Annotated[PlanCategoryDefaultService, Depends(get_plan_category_default_service)],
):
    return await service.get_plan_category_defaults()


@router.post(
    "",
    response_model=MutationResponse[PlanCategoryDefaultSchema],
    status_code=status.HTTP_201_CREATED,
)
async def create_plan_category_default(
    data: PlanCategoryDefaultCreate,
    service: Annotated[PlanCategoryDefaultService, Depends(get_plan_category_default_service)],
):
    return await service.create_plan_category_default(data)


@router.delete("/{plan_category_default_id}", status_code=status.HTTP_200_OK)
async def delete_plan_category_default(
    plan_category_default_id: int,
    service: Annotated[PlanCategoryDefaultService, Depends(get_plan_category_default_service)],
):
    await service.delete_plan_category_default(plan_category_default_id)
