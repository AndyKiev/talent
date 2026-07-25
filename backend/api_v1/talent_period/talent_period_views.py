from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from fastapi.security import HTTPBearer

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.talent_period.talent_period_dependencies import (
    get_talent_period_service,
    talent_period_by_id,
)
from backend.api_v1.talent_period.talent_period_schema import (
    TalentPeriod as TalentPeriodSchema,
)
from backend.api_v1.talent_period.talent_period_schema import (
    TalentPeriodCreate,
    TalentPeriodUpdate,
)
from backend.api_v1.talent_period.talent_period_service import TalentPeriodService
from backend.auth.guards import Guard
from backend.utils.enums import EssenceName, OperationVerb

router = APIRouter(
    prefix="/admin/talent_periods",
    tags=["Talent Periods"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get(
    "",
    response_model=list[TalentPeriodSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.TALENT_PERIOD)],
)
async def get_talent_periods(
    service: Annotated[TalentPeriodService, Depends(get_talent_period_service)],
    name: str | None = None,
    is_active: bool | None = None,
    sort: str | None = Query(None, description='JSON: {"field": "asc|desc"}'),
):
    return await service.get_talent_periods(name=name, is_active=is_active, sort=sort)


@router.get(
    "/{talent_period_id}",
    response_model=TalentPeriodSchema,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.TALENT_PERIOD)],
)
async def get_talent_period(
    record: TalentPeriodSchema = Depends(talent_period_by_id),
):
    return record


@router.post(
    "",
    response_model=MutationResponse[TalentPeriodSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.CREATE, EssenceName.TALENT_PERIOD)],
)
async def create_talent_period(
    period_in: TalentPeriodCreate,
    service: Annotated[TalentPeriodService, Depends(get_talent_period_service)],
):
    return await service.create_talent_period(period_in)


@router.patch(
    "/{talent_period_id}",
    response_model=MutationResponse[TalentPeriodSchema],
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.TALENT_PERIOD)],
)
async def update_talent_period(
    period_update: TalentPeriodUpdate,
    record: TalentPeriodSchema = Depends(talent_period_by_id),
    service: Annotated[TalentPeriodService, Depends(get_talent_period_service)] = None,
):
    return await service.update_talent_period(record.id, period_update)


@router.delete(
    "/{talent_period_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.DELETE, EssenceName.TALENT_PERIOD)],
)
async def delete_talent_period(
    talent_period_id: int,
    service: Annotated[TalentPeriodService, Depends(get_talent_period_service)],
):
    await service.delete_talent_period(talent_period_id)
