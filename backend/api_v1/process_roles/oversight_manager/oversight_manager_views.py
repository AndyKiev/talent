from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.process_roles.oversight_manager.oversight_manager_dependencies import (
    get_oversight_manager_service,
)
from backend.api_v1.process_roles.oversight_manager.oversight_manager_schema import (
    MyOversightManager,
    OversightManagerOption,
    SetOversightManager,
)
from backend.api_v1.process_roles.oversight_manager.oversight_manager_service import (
    OversightManagerService,
)
from backend.auth.jwt_auth import get_current_active_auth_user

# Self-service, mounted under the people_review namespace (alongside /my_scopes):
# a user picks their own oversight reviewer from the existing oversight holders.
router = APIRouter(
    prefix="/people_review",
    tags=["People Review Oversight Manager"],
    dependencies=[Depends(get_current_active_auth_user)],
)


@router.get("/oversight_managers", response_model=list[OversightManagerOption])
async def get_oversight_managers(
    service: Annotated[OversightManagerService, Depends(get_oversight_manager_service)],
    short: Annotated[bool, Query(description="Return only managers from the user's department scope")] = False,
):
    return await service.get_candidate_managers(short=short)


@router.get("/my_oversight_manager", response_model=Optional[MyOversightManager])
async def get_my_oversight_manager(
    service: Annotated[OversightManagerService, Depends(get_oversight_manager_service)],
):
    return await service.get_my_manager()


@router.put(
    "/my_oversight_manager",
    response_model=MutationResponse[MyOversightManager],
)
async def set_my_oversight_manager(
    payload: SetOversightManager,
    service: Annotated[OversightManagerService, Depends(get_oversight_manager_service)],
):
    return await service.set_my_manager(payload)


@router.delete(
    "/my_oversight_manager",
    response_model=MutationResponse[None],
)
async def clear_my_oversight_manager(
    service: Annotated[OversightManagerService, Depends(get_oversight_manager_service)],
):
    return await service.clear_my_manager()
