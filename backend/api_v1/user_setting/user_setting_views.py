from fastapi import APIRouter, Depends, status
from fastapi.security import HTTPBearer
from typing import Annotated, List

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.user_setting.user_setting_schema import (
    UserSetting as UserSettingSchema,
    UserSettingWrite,
    EffectiveUserSetting,
)
from backend.api_v1.user_setting.user_setting_dependencies import (
    get_user_setting_service,
)
from backend.api_v1.user_setting.user_setting_service import UserSettingService

router = APIRouter(
    prefix="/user_settings",
    tags=["User Settings"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get("/effective", response_model=List[EffectiveUserSetting])
async def get_effective_user_settings(
    service: Annotated[UserSettingService, Depends(get_user_setting_service)],
):
    return await service.get_effective_settings()


@router.put("/{key}", response_model=MutationResponse[UserSettingSchema])
async def set_user_setting(
    key: str,
    body: UserSettingWrite,
    service: Annotated[UserSettingService, Depends(get_user_setting_service)],
):
    return await service.set_override(key, body.value)


@router.delete("/{key}", status_code=status.HTTP_200_OK)
async def delete_user_setting(
    key: str,
    service: Annotated[UserSettingService, Depends(get_user_setting_service)],
):
    await service.delete_override(key)
