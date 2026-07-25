from typing import Annotated

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.training_category.training_category_dependencies import (
    get_training_category_service,
    training_category_by_id,
)
from backend.api_v1.training_category.training_category_schema import (
    TrainingCategory as TrainingCategorySchema,
)
from backend.api_v1.training_category.training_category_schema import (
    TrainingCategoryCreate,
    TrainingCategoryUpdate,
)
from backend.api_v1.training_category.training_category_service import (
    TrainingCategoryService,
)
from backend.auth.guards import Guard
from backend.utils.enums import EssenceName, OperationVerb
from fastapi import APIRouter, Depends, status
from fastapi.security import HTTPBearer

router = APIRouter(
    prefix="/training_categories",
    tags=["Training Categories"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get(
    "",
    response_model=list[TrainingCategorySchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.TRAINING_CATEGORY)],
)
async def get_training_categories(
    service: Annotated[TrainingCategoryService, Depends(get_training_category_service)],
):
    return await service.get_training_categories()


@router.get(
    "/{training_category_id}",
    response_model=TrainingCategorySchema,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.TRAINING_CATEGORY)],
)
async def get_training_category(
    record: TrainingCategorySchema = Depends(training_category_by_id),
):
    return record


@router.post(
    "",
    response_model=MutationResponse[TrainingCategorySchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.CREATE, EssenceName.TRAINING_CATEGORY)],
)
async def create_training_category(
    data: TrainingCategoryCreate,
    service: Annotated[TrainingCategoryService, Depends(get_training_category_service)],
):
    return await service.create_training_category(data)


@router.patch(
    "/{training_category_id}",
    response_model=MutationResponse[TrainingCategorySchema],
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.TRAINING_CATEGORY)],
)
async def update_training_category(
    data: TrainingCategoryUpdate,
    record: TrainingCategorySchema = Depends(training_category_by_id),
    service: Annotated[TrainingCategoryService, Depends(get_training_category_service)] = None,
):
    return await service.update_training_category(record.id, data)


@router.delete(
    "/{training_category_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.DELETE, EssenceName.TRAINING_CATEGORY)],
)
async def delete_training_category(
    training_category_id: int,
    service: Annotated[TrainingCategoryService, Depends(get_training_category_service)],
):
    await service.delete_training_category(training_category_id)
