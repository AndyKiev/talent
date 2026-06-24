# backend/api_v1/operation_essence_link/operation_essence_link_views.py
#
# Admin API for:
#   - Listing all (verb, essence) permission pairs
#   - Creating / deleting permission pairs
#   - Granting / revoking pairs to/from user groups
#   - Setting a user group's full permission set (bulk replace)
#
from fastapi import APIRouter, Depends, status, HTTPException
from fastapi.security import HTTPBearer
from typing import Annotated, List, Optional
from pydantic import BaseModel

from backend.api_v1.operation_essence_link.operation_essence_link_service import (
    OperationEssenceLinkService,
    PermissionPairSchema,
    GrantPermissionRequest,
    SetGroupPermissionsRequest,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.auth.jwt_auth import has_access

from backend.utils.enums import OperationVerb, EssenceName
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.db_helper import db_helper

router = APIRouter(
    prefix="/admin/permissions",
    tags=["Permissions (OP × Essence)"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


async def get_oel_service(
    session: AsyncSession = Depends(db_helper.session_getter),
) -> OperationEssenceLinkService:
    return OperationEssenceLinkService(session)


# ── Permission pair CRUD ──────────────────────────────────────────────────────


@router.get("", response_model=List[PermissionPairSchema])
async def list_permission_pairs(
    service: Annotated[OperationEssenceLinkService, Depends(get_oel_service)],
    operation_name: Optional[str] = None,
    essence_name: Optional[str] = None,
    # _auth_user: Annotated[
    #     UserSchema,
    #     Depends(has_access(OperationVerb.VIEW, EssenceName.OPERATION)),
    # ] = None,
):
    """List all (verb, essence) permission pairs defined in the system."""
    links = await service.get_all(
        operation_name=operation_name, essence_name=essence_name
    )
    return [
        PermissionPairSchema(
            id=l.id,
            operation_id=l.operation_id,
            operation_name=l.operation_name,
            essence_id=l.essence_id,
            essence_name=l.essence_name,
            user_group_names=[
                ugoel.user_group.name
                for ugoel in l.user_group_links
                if ugoel.user_group
            ],
        )
        for l in links
    ]


@router.post(
    "",
    response_model=PermissionPairSchema,
    status_code=status.HTTP_201_CREATED,
)
async def create_permission_pair(
    body: GrantPermissionRequest,
    service: Annotated[OperationEssenceLinkService, Depends(get_oel_service)],
    # _auth_user: Annotated[
    #     UserSchema,
    #     Depends(has_access(OperationVerb.CREATE, EssenceName.OPERATION)),
    # ] = None,
):
    """Create a (verb, essence) permission pair. Idempotent — returns existing if already present."""
    link = await service.get_or_create_pair(body.operation_id, body.essence_id)
    await service.commit()
    return PermissionPairSchema(
        id=link.id,
        operation_id=link.operation_id,
        operation_name=link.operation_name,
        essence_id=link.essence_id,
        essence_name=link.essence_name,
    )


@router.delete("/{oel_id}", status_code=status.HTTP_200_OK)
async def delete_permission_pair(
    oel_id: int,
    service: Annotated[OperationEssenceLinkService, Depends(get_oel_service)],
    # _auth_user: Annotated[
    #     UserSchema,
    #     Depends(has_access(OperationVerb.DELETE, EssenceName.OPERATION)),
    # ] = None,
):
    """
    Delete a permission pair. CASCADE removes all group grants for this pair,
    immediately revoking it from every group that held it.
    """
    await service.delete_pair(oel_id)
    await service.commit()


# ── Group grant endpoints ─────────────────────────────────────────────────────


@router.get("/user_groups/{user_group_id}", response_model=List[PermissionPairSchema])
async def get_group_permissions(
    user_group_id: int,
    service: Annotated[OperationEssenceLinkService, Depends(get_oel_service)],
    # _auth_user: Annotated[
    #     UserSchema,
    #     Depends(has_access(OperationVerb.VIEW, EssenceName.USER_GROUP)),
    # ] = None,
):
    """List all (verb, essence) permissions currently granted to a user group."""
    links = await service.get_for_user_group(user_group_id)
    return [
        PermissionPairSchema(
            id=l.id,
            operation_id=l.operation_id,
            operation_name=l.operation_name,
            essence_id=l.essence_id,
            essence_name=l.essence_name,
        )
        for l in links
    ]


@router.post(
    "/user_groups/{user_group_id}/{oel_id}",
    status_code=status.HTTP_201_CREATED,
)
async def grant_permission_to_group(
    user_group_id: int,
    oel_id: int,
    service: Annotated[OperationEssenceLinkService, Depends(get_oel_service)],
    # _auth_user: Annotated[
    #     UserSchema,
    #     Depends(has_access(OperationVerb.ASSIGN, EssenceName.USER_GROUP)),
    # ] = None,
):
    """Grant a single permission pair to a user group (idempotent)."""
    await service.grant_to_group(user_group_id, oel_id)
    await service.commit()


@router.delete("/user_groups/{user_group_id}/{oel_id}", status_code=status.HTTP_200_OK)
async def revoke_permission_from_group(
    user_group_id: int,
    oel_id: int,
    service: Annotated[OperationEssenceLinkService, Depends(get_oel_service)],
    # _auth_user: Annotated[
    #     UserSchema,
    #     Depends(has_access(OperationVerb.ASSIGN, EssenceName.USER_GROUP)),
    # ] = None,
):
    """Revoke a single permission pair from a user group."""
    await service.revoke_from_group(user_group_id, oel_id)
    await service.commit()


@router.put("/user_groups/{user_group_id}", status_code=status.HTTP_200_OK)
async def set_group_permissions(
    user_group_id: int,
    body: SetGroupPermissionsRequest,
    service: Annotated[OperationEssenceLinkService, Depends(get_oel_service)],
    # _auth_user: Annotated[
    #     UserSchema,
    #     Depends(has_access(OperationVerb.ASSIGN, EssenceName.USER_GROUP)),
    # ] = None,
):
    """
    Full replace — set exactly this list of OEL ids as the group's permissions.
    Adds new grants, removes revoked ones. Safe to call repeatedly.
    """
    await service.set_group_permissions(user_group_id, body.operation_essence_link_ids)
    await service.commit()
