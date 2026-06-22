from fastapi import APIRouter, Depends, status, Query
from fastapi.security import HTTPBearer
from typing import Annotated, Optional, List

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.app_setting.app_setting_schema import (
    AppSetting as AppSettingSchema,
    AppSettingCreate,
    AppSettingUpdate,
)
from backend.api_v1.app_setting.app_setting_dependencies import (
    get_app_setting_service,
    app_setting_by_id,
)
from backend.api_v1.app_setting.app_setting_service import AppSettingService

router = APIRouter(
    prefix="/app_settings",
    tags=["App Settings"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get("", response_model=List[AppSettingSchema])
async def get_app_settings(
    service: Annotated[AppSettingService, Depends(get_app_setting_service)],
    sort: Optional[str] = Query(
        None,
        description='JSON for sorting: {"field": "asc|desc"} or [{"field1": "asc"}, "field2"]',
    ),
):
    return await service.get_app_settings(sort=sort)


# Static path before the dynamic /{id} route.
@router.get("/by_key/{key}", response_model=AppSettingSchema)
async def get_app_setting_by_key(
    key: str,
    service: Annotated[AppSettingService, Depends(get_app_setting_service)],
):
    return await service.get_by_key(key)


@router.get("/{app_setting_id}", response_model=AppSettingSchema)
async def get_app_setting(
    record: AppSettingSchema = Depends(app_setting_by_id),
):
    return record


@router.post(
    "",
    response_model=MutationResponse[AppSettingSchema],
    status_code=status.HTTP_201_CREATED,
)
async def create_app_setting(
    setting_in: AppSettingCreate,
    service: Annotated[AppSettingService, Depends(get_app_setting_service)],
):
    return await service.create_app_setting(setting_in)


@router.patch(
    "/{app_setting_id}",
    response_model=MutationResponse[AppSettingSchema],
)
async def update_app_setting(
    setting_update: AppSettingUpdate,
    record: AppSettingSchema = Depends(app_setting_by_id),
    service: Annotated[AppSettingService, Depends(get_app_setting_service)] = None,
):
    return await service.update_app_setting(record.id, setting_update)


@router.delete("/{app_setting_id}", status_code=status.HTTP_200_OK)
async def delete_app_setting(
    app_setting_id: int,
    service: Annotated[AppSettingService, Depends(get_app_setting_service)],
):
    await service.delete_app_setting(app_setting_id)
