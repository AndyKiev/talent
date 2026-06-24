# backend/api_v1/operation_essence_set_link/operation_essence_set_link_views.py
#
# Admin API for set-grain permissions:
#   - List / create / delete  (operation, {essence, ...}) permissions
#   - Grant / revoke / bulk-set those permissions to/from user groups
#   - Apply an uploaded permission matrix (BA grid round-trip; dry-run + commit)
#
# Route ordering: every static "/user_groups/..." and "/apply_matrix" path is
# declared BEFORE the dynamic "/{link_id}" route so it never shadows them.
#
# Guards:
#   - permission CRUD itself   -> VIEW/CREATE/DELETE {operation}
#   - group grant/revoke/set   -> ASSIGN {user_group}
#   - group permission list    -> VIEW   {user_group}
#   - apply_matrix (bulk grant)-> ASSIGN {user_group}
#
from fastapi import APIRouter, Depends, Request, status
from fastapi.security import HTTPBearer
from typing import Annotated, List
from pydantic import BaseModel

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.operation_essence_set_link.operation_essence_set_link_schema import (
    OperationEssenceSetLinkSchema,
    OperationEssenceSetLinkCreate,
    PermissionMatrixApplyRequest,
    PermissionMatrixApplyResult,
    PermissionSyncResult,
)
from backend.api_v1.operation_essence_set_link.operation_essence_set_link_dependencies import (
    get_operation_essence_set_link_service,
)
from backend.api_v1.operation_essence_set_link.operation_essence_set_link_service import (
    OperationEssenceSetLinkService,
)
from backend.auth.guards import Guard
from backend.utils.enums import OperationVerb, EssenceName


router = APIRouter(
    prefix="/permissions_set",
    tags=["Permissions (set grain)"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


class SetGroupPermissionSetsRequest(BaseModel):
    """Full-replace payload: the exact list of OESL ids the group should hold."""

    operation_essence_set_link_ids: List[int]


# -- Permission CRUD -----------------------------------------------------------


@router.get(
    "",
    response_model=List[OperationEssenceSetLinkSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.OPERATION)],
)
async def get_permissions(
    service: Annotated[
        OperationEssenceSetLinkService,
        Depends(get_operation_essence_set_link_service),
    ],
):
    """List all set-grain (verb, {essence, ...}) permissions."""
    return await service.get_all()


@router.post(
    "",
    response_model=MutationResponse[OperationEssenceSetLinkSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.CREATE, EssenceName.OPERATION)],
)
async def create_permission(
    link_in: OperationEssenceSetLinkCreate,
    service: Annotated[
        OperationEssenceSetLinkService,
        Depends(get_operation_essence_set_link_service),
    ],
):
    """Create a set-grain permission for an operation and a set of essences."""
    return await service.create(link_in)


# -- Permission-matrix apply (STATIC — must precede /{link_id}) ----------------


@router.post(
    "/apply_matrix",
    response_model=PermissionMatrixApplyResult,
    dependencies=[Guard(OperationVerb.ASSIGN, EssenceName.USER_GROUP)],
)
async def apply_permission_matrix(
    payload: PermissionMatrixApplyRequest,
    service: Annotated[
        OperationEssenceSetLinkService,
        Depends(get_operation_essence_set_link_service),
    ],
    dry_run: bool = True,
):
    """
    Apply an uploaded permission matrix (the JSON the BA grid downloads).

    Each group carries its FULL desired set of permission ids (full-replace).
    Call with ?dry_run=true (default) to preview the diff without writing, then
    ?dry_run=false to commit. Unknown ids are reported and skipped.
    """
    return await service.apply_matrix(payload, dry_run=dry_run)


@router.post(
    "/sync_from_routes",
    response_model=PermissionSyncResult,
    dependencies=[Guard(OperationVerb.CREATE, EssenceName.OPERATION)],
)
async def sync_permissions_from_routes(
    request: Request,
    service: Annotated[
        OperationEssenceSetLinkService,
        Depends(get_operation_essence_set_link_service),
    ],
):
    """
    Materialise every guard-required permission into permissions_set so the
    matrix has a full set of rows. Idempotent. Permissions whose operation or
    essence isn't seeded yet are reported in `skipped`.
    """
    return await service.sync_from_routes(request.app)


# -- Group grant endpoints (STATIC paths — must precede /{link_id}) ------------


@router.get(
    "/user_groups/{user_group_id}",
    response_model=List[OperationEssenceSetLinkSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.USER_GROUP)],
)
async def get_group_permission_sets(
    user_group_id: int,
    service: Annotated[
        OperationEssenceSetLinkService,
        Depends(get_operation_essence_set_link_service),
    ],
):
    """List all set-grain permissions currently granted to a user group."""
    return await service.get_for_user_group(user_group_id)


@router.post(
    "/user_groups/{user_group_id}/{link_id}",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.ASSIGN, EssenceName.USER_GROUP)],
)
async def grant_permission_set_to_group(
    user_group_id: int,
    link_id: int,
    service: Annotated[
        OperationEssenceSetLinkService,
        Depends(get_operation_essence_set_link_service),
    ],
):
    """Grant a single set-grain permission to a user group (idempotent)."""
    await service.grant_to_group(user_group_id, link_id)


@router.delete(
    "/user_groups/{user_group_id}/{link_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.ASSIGN, EssenceName.USER_GROUP)],
)
async def revoke_permission_set_from_group(
    user_group_id: int,
    link_id: int,
    service: Annotated[
        OperationEssenceSetLinkService,
        Depends(get_operation_essence_set_link_service),
    ],
):
    """Revoke a single set-grain permission from a user group."""
    await service.revoke_from_group(user_group_id, link_id)


@router.put(
    "/user_groups/{user_group_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.ASSIGN, EssenceName.USER_GROUP)],
)
async def set_group_permission_sets(
    user_group_id: int,
    body: SetGroupPermissionSetsRequest,
    service: Annotated[
        OperationEssenceSetLinkService,
        Depends(get_operation_essence_set_link_service),
    ],
):
    """
    Full replace — set exactly this list of OESL ids as the group's set-grain
    permissions. Adds new grants, removes revoked ones. Safe to call repeatedly.
    """
    await service.set_group_permissions(
        user_group_id, body.operation_essence_set_link_ids
    )


# -- Dynamic route LAST so it can't shadow the static paths above --------------


@router.delete(
    "/{link_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.DELETE, EssenceName.OPERATION)],
)
async def delete_permission(
    link_id: int,
    service: Annotated[
        OperationEssenceSetLinkService,
        Depends(get_operation_essence_set_link_service),
    ],
):
    """Delete a set-grain permission. CASCADE revokes it from all groups."""
    await service.delete(link_id)
