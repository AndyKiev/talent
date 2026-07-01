from fastapi import APIRouter, Depends, status
from fastapi.security import HTTPBearer
from typing import Annotated, List

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.training_link_type.training_link_type_schema import (
    TrainingLinkType as TrainingLinkTypeSchema,
    TrainingLinkTypeCreate,
    TrainingLinkTypeUpdate,
)
from backend.api_v1.training_link_type.training_link_type_dependencies import (
    get_training_link_type_service,
    training_link_type_by_id,
)
from backend.api_v1.training_link_type.training_link_type_service import (
    TrainingLinkTypeService,
)
from backend.auth.guards import Guard
from backend.utils.enums import OperationVerb, EssenceName

router = APIRouter(
    prefix="/training_link_types",
    tags=["Training Link Types"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get(
    "",
    response_model=List[TrainingLinkTypeSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.TRAINING_LINK_TYPE)],
)
async def get_training_link_types(
    service: Annotated[TrainingLinkTypeService, Depends(get_training_link_type_service)],
):
    return await service.get_training_link_types()


@router.get(
    "/{training_link_type_id}",
    response_model=TrainingLinkTypeSchema,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.TRAINING_LINK_TYPE)],
)
async def get_training_link_type(
    record: TrainingLinkTypeSchema = Depends(training_link_type_by_id),
):
    return record


@router.post(
    "",
    response_model=MutationResponse[TrainingLinkTypeSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.CREATE, EssenceName.TRAINING_LINK_TYPE)],
)
async def create_training_link_type(
    data: TrainingLinkTypeCreate,
    service: Annotated[TrainingLinkTypeService, Depends(get_training_link_type_service)],
):
    return await service.create_training_link_type(data)


@router.patch(
    "/{training_link_type_id}",
    response_model=MutationResponse[TrainingLinkTypeSchema],
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.TRAINING_LINK_TYPE)],
)
async def update_training_link_type(
    data: TrainingLinkTypeUpdate,
    record: TrainingLinkTypeSchema = Depends(training_link_type_by_id),
    service: Annotated[TrainingLinkTypeService, Depends(get_training_link_type_service)] = None,
):
    return await service.update_training_link_type(record.id, data)


@router.delete(
    "/{training_link_type_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.DELETE, EssenceName.TRAINING_LINK_TYPE)],
)
async def delete_training_link_type(
    training_link_type_id: int,
    service: Annotated[TrainingLinkTypeService, Depends(get_training_link_type_service)],
):
    await service.delete_training_link_type(training_link_type_id)
