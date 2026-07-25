from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.setting_value_type.setting_value_type_dependencies import (
    get_setting_value_type_service,
    setting_value_type_by_id,
)
from backend.api_v1.setting_value_type.setting_value_type_schema import (
    SettingValueType as SettingValueTypeSchema,
)
from backend.api_v1.setting_value_type.setting_value_type_schema import (
    SettingValueTypeCreate,
    SettingValueTypeUpdate,
)
from backend.api_v1.setting_value_type.setting_value_type_service import (
    SettingValueTypeService,
)
from backend.auth.guards import Guard
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.utils.enums import EssenceName, OperationVerb

router = APIRouter(
    prefix="/setting_value_types",
    tags=["Setting Value Types"],
    dependencies=[Depends(get_current_active_auth_user)],
)


@router.get(
    "",
    response_model=list[SettingValueTypeSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.SETTING_VALUE_TYPE)],
)
async def get_setting_value_types(
    service: Annotated[
        SettingValueTypeService, Depends(get_setting_value_type_service)
    ],
    sort: str | None = Query(
        None,
        description='JSON for sorting: {"field": "asc|desc"} or [{"field1": "asc"}, "field2"]',
    ),
):
    return await service.get_setting_value_types(sort=sort)


@router.get(
    "/{setting_value_type_id}",
    response_model=SettingValueTypeSchema,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.SETTING_VALUE_TYPE)],
)
async def get_setting_value_type(
    record: SettingValueTypeSchema = Depends(setting_value_type_by_id),
):
    return record


@router.post(
    "",
    response_model=MutationResponse[SettingValueTypeSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.CREATE, EssenceName.SETTING_VALUE_TYPE)],
)
async def create_setting_value_type(
    type_in: SettingValueTypeCreate,
    service: Annotated[
        SettingValueTypeService, Depends(get_setting_value_type_service)
    ],
):
    return await service.create_setting_value_type(type_in)


@router.patch(
    "/{setting_value_type_id}",
    response_model=MutationResponse[SettingValueTypeSchema],
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.SETTING_VALUE_TYPE)],
)
async def update_setting_value_type(
    type_update: SettingValueTypeUpdate,
    record: SettingValueTypeSchema = Depends(setting_value_type_by_id),
    service: Annotated[
        SettingValueTypeService, Depends(get_setting_value_type_service)
    ] = None,
):
    return await service.update_setting_value_type(record.id, type_update)


@router.delete(
    "/{setting_value_type_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.DELETE, EssenceName.SETTING_VALUE_TYPE)],
)
async def delete_setting_value_type(
    setting_value_type_id: int,
    service: Annotated[
        SettingValueTypeService, Depends(get_setting_value_type_service)
    ],
):
    await service.delete_setting_value_type(setting_value_type_id)
