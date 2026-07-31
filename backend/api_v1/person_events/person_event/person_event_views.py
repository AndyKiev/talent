from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from fastapi.security import HTTPBearer

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.person_events.person_event.person_event_dependencies import (
    get_person_event_service,
)
from backend.api_v1.person_events.person_event.person_event_schema import (
    LastNameChangeCreate,
    PersonEventSchema,
    PersonEventStatusUpdate,
)
from backend.api_v1.person_events.person_event.person_event_service import (
    PersonEventService,
)
from backend.auth.guards import Guard
from backend.utils.enums import EssenceName, OperationVerb

router = APIRouter(
    prefix="/person_events",
    tags=["Person Events"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get(
    "/by_person/{person_id}",
    response_model=list[PersonEventSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.PERSON_EVENT)],
)
async def get_person_events(
    person_id: int,
    service: Annotated[PersonEventService, Depends(get_person_event_service)],
):
    """A person's event history, newest effective date first."""
    return await service.get_person_events(person_id)


@router.post(
    "/by_person/{person_id}/last_name_change",
    response_model=MutationResponse[PersonEventSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.CREATE, EssenceName.PERSON_EVENT)],
)
async def create_last_name_change(
    person_id: int,
    payload: LastNameChangeCreate,
    service: Annotated[PersonEventService, Depends(get_person_event_service)],
):
    """Record a surname change from a given date. Creates a DRAFT event — the
    person is only renamed once it is applied."""
    return await service.create_last_name_change(person_id, payload)


@router.patch(
    "/{person_event_id}/status",
    response_model=MutationResponse[PersonEventSchema],
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.PERSON_EVENT)],
)
async def change_person_event_status(
    person_event_id: int,
    payload: PersonEventStatusUpdate,
    service: Annotated[PersonEventService, Depends(get_person_event_service)],
):
    """Move the event along its lifecycle. Applying it writes the person."""
    return await service.change_status(person_event_id, payload.status)


@router.delete(
    "/{person_event_id}",
    dependencies=[Guard(OperationVerb.DELETE, EssenceName.PERSON_EVENT)],
)
async def delete_person_event(
    person_event_id: int,
    service: Annotated[PersonEventService, Depends(get_person_event_service)],
):
    """Delete a not-yet-applied event. Applied events are history and stay."""
    return await service.delete_person_event(person_event_id)


@router.post(
    "/apply_due",
    dependencies=[Guard(OperationVerb.APPLY, EssenceName.PERSON_EVENT)],
)
async def apply_due_person_events(
    service: Annotated[PersonEventService, Depends(get_person_event_service)],
    on_or_before: date | None = Query(
        None, description="Defaults to today. Applies every READY event due by then."
    ),
):
    return await service.apply_due_person_events(on_or_before)
