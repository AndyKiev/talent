from typing import Annotated

from fastapi import APIRouter, Depends, status

from backend.api_v1.language_level.language_level_dependencies import (
    get_language_level_service,
    language_level_by_id,
)
from backend.api_v1.language_level.language_level_model import (
    LanguageLevel as LanguageLevelModel,
)
from backend.api_v1.language_level.language_level_schema import (
    LanguageLevel as LanguageLevelSchema,
)
from backend.api_v1.language_level.language_level_schema import (
    LanguageLevelCreate,
    LanguageLevelUpdate,
)
from backend.api_v1.language_level.language_level_service import LanguageLevelService
from backend.auth.guards import Guard
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.utils.enums import EssenceName, OperationVerb

router = APIRouter(
    prefix="/language_levels",
    tags=["Language Levels"],
    dependencies=[Depends(get_current_active_auth_user)],
)


@router.get("", response_model=list[LanguageLevelSchema])
async def get_language_levels(
    service: Annotated[LanguageLevelService, Depends(get_language_level_service)],
):
    records = await service.get_all(sort={"sort_order": "asc"})
    return [LanguageLevelSchema.model_validate(x) for x in records]


@router.get("/{language_level_id}", response_model=LanguageLevelSchema)
async def get_language_level(
    record: LanguageLevelSchema = Depends(language_level_by_id),
):
    return record


@router.post(
    "",
    response_model=LanguageLevelSchema,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.CREATE, EssenceName.LANGUAGE_LEVEL)],
)
async def create_language_level(
    payload: LanguageLevelCreate,
    service: Annotated[LanguageLevelService, Depends(get_language_level_service)],
):
    return await service.create(payload)


@router.patch(
    "/{language_level_id}",
    response_model=LanguageLevelSchema,
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.LANGUAGE_LEVEL)],
)
async def update_language_level(
    payload: LanguageLevelUpdate,
    record: LanguageLevelModel = Depends(language_level_by_id),
    service: Annotated[
        LanguageLevelService, Depends(get_language_level_service)
    ] = None,
):
    return await service.update(record, payload)


@router.delete(
    "/{language_level_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.DELETE, EssenceName.LANGUAGE_LEVEL)],
)
async def delete_language_level(
    service: Annotated[LanguageLevelService, Depends(get_language_level_service)],
    record: LanguageLevelModel = Depends(language_level_by_id),
):
    await service.delete(record)
