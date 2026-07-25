from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from fastapi.security import HTTPBearer

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.talent_status_period_link.talent_status_period_link_dependencies import (
    get_talent_status_period_link_service,
    talent_status_period_link_by_composite_key,
    talent_status_period_link_by_id,
)
from backend.api_v1.talent_status_period_link.talent_status_period_link_schema import (
    TalentStatusPeriodLink as TalentStatusPeriodLinkSchema,
)
from backend.api_v1.talent_status_period_link.talent_status_period_link_schema import (
    TalentStatusPeriodLinkCreate,
    TalentStatusPeriodLinkUpdate,
    TalentStatusPeriodLinkWithLabel,
)
from backend.api_v1.talent_status_period_link.talent_status_period_link_service import (
    TalentStatusPeriodLinkService,
)
from backend.auth.guards import Guard
from backend.utils.enums import EssenceName, OperationVerb

router = APIRouter(
    prefix="/talent_status_period_links",
    tags=["Talent Status–Period Links"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get(
    "",
    response_model=list[TalentStatusPeriodLinkSchema],
    dependencies=[
        Guard(OperationVerb.VIEW, EssenceName.TALENT_STATUS, EssenceName.TALENT_PERIOD)
    ],
)
async def get_talent_status_period_links(
    service: Annotated[
        TalentStatusPeriodLinkService, Depends(get_talent_status_period_link_service)
    ],
    talent_period_id: int | None = None,
    talent_status_id: int | None = None,
    is_active: bool | None = None,
    sort: str | None = Query(None, description='JSON: {"field": "asc|desc"}'),
):
    """
    List links. Filter by ?talent_period_id=, ?talent_status_id=, or ?is_active=.
    When period or status filter is provided, the dedicated index query is used.
    """
    return await service.get_links(
        talent_period_id=talent_period_id,
        talent_status_id=talent_status_id,
        is_active=is_active,
        sort=sort,
    )


@router.get(
    "/active_pairs",
    response_model=list[TalentStatusPeriodLinkWithLabel],
    dependencies=[
        Guard(OperationVerb.VIEW, EssenceName.TALENT_STATUS, EssenceName.TALENT_PERIOD)
    ],
)
async def get_talent_status_period_active_pairs(
    service: Annotated[
        TalentStatusPeriodLinkService, Depends(get_talent_status_period_link_service)
    ],
    is_active: bool | None = Query(
        None,
        description=(
            "True → only rows where link, status AND period are all active. "
            "False or omitted → return all rows regardless of any is_active flag."
        ),
    ),
):
    """
    Returns links enriched with a computed label (e.g. "PO - 24") for use in
    employee-form select dropdowns.

    - `?is_active=true`  — link.is_active AND status.is_active AND period.is_active must all be True
    - `?is_active=false` — all rows returned (no active-filtering at any level)
    - omitted            — same as false
    """
    return await service.get_active_pairs(is_active=is_active)


@router.get(
    "/by_composite_key",
    response_model=TalentStatusPeriodLinkSchema,
    dependencies=[
        Guard(OperationVerb.VIEW, EssenceName.TALENT_STATUS, EssenceName.TALENT_PERIOD)
    ],
)
async def get_talent_status_period_link_by_composite_key(
    record: TalentStatusPeriodLinkSchema = Depends(
        talent_status_period_link_by_composite_key
    ),
):
    """
    Fetch a single link by its unique (talent_status_id, talent_period_id) pair.
    Query params: ?talent_status_id=1&talent_period_id=2
    """
    return record


@router.get(
    "/{talent_status_period_link_id}",
    response_model=TalentStatusPeriodLinkSchema,
    dependencies=[
        Guard(OperationVerb.VIEW, EssenceName.TALENT_STATUS, EssenceName.TALENT_PERIOD)
    ],
)
async def get_talent_status_period_link(
    record: TalentStatusPeriodLinkSchema = Depends(talent_status_period_link_by_id),
):
    return record


@router.post(
    "",
    response_model=MutationResponse[TalentStatusPeriodLinkSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[
        Guard(OperationVerb.LINK, EssenceName.TALENT_STATUS, EssenceName.TALENT_PERIOD)
    ],
)
async def create_talent_status_period_link(
    link_in: TalentStatusPeriodLinkCreate,
    service: Annotated[
        TalentStatusPeriodLinkService, Depends(get_talent_status_period_link_service)
    ],
):
    """Link a talent status to a talent period. The (status, period) pair must be unique."""
    return await service.create_link(link_in)


@router.patch(
    "/{talent_status_period_link_id}",
    response_model=MutationResponse[TalentStatusPeriodLinkSchema],
    dependencies=[
        Guard(OperationVerb.LINK, EssenceName.TALENT_STATUS, EssenceName.TALENT_PERIOD)
    ],
)
async def update_talent_status_period_link(
    link_update: TalentStatusPeriodLinkUpdate,
    record: TalentStatusPeriodLinkSchema = Depends(talent_status_period_link_by_id),
    service: Annotated[
        TalentStatusPeriodLinkService, Depends(get_talent_status_period_link_service)
    ] = None,
):
    """Update link attributes (currently: is_active)."""
    return await service.update_link(record.id, link_update)


@router.delete(
    "/{talent_status_period_link_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[
        Guard(OperationVerb.LINK, EssenceName.TALENT_STATUS, EssenceName.TALENT_PERIOD)
    ],
)
async def delete_talent_status_period_link(
    talent_status_period_link_id: int,
    service: Annotated[
        TalentStatusPeriodLinkService, Depends(get_talent_status_period_link_service)
    ],
):
    """Unlink a talent status from a talent period."""
    await service.delete_link(talent_status_period_link_id)
