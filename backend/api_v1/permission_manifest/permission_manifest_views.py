# backend/api_v1/permission_manifest/permission_manifest_views.py
#
# Read-only admin endpoint. Walks the live FastAPI route table and reports every
# guarded endpoint, the distinct (operation, essence-set) permissions behind
# them, and a seed diff (operations / essences referenced in code but absent
# from the DB tables). Writes nothing. This is the catalog the permission-matrix
# UI will be built on.
#
from typing import Annotated

from fastapi import APIRouter, Depends, Request
from fastapi.security import HTTPBearer

from backend.api_v1.permission_manifest.permission_manifest_schema import (
    PermissionManifest,
)
from backend.api_v1.permission_manifest.permission_manifest_dependencies import (
    get_permission_manifest_service,
)
from backend.api_v1.permission_manifest.permission_manifest_service import (
    PermissionManifestService,
)

from backend.auth.guards import Guard
from backend.utils.enums import OperationVerb, EssenceName

router = APIRouter(
    prefix="/admin",
    tags=["Admin · Permission manifest"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get(
    "/permission_manifest",
    response_model=PermissionManifest,
    dependencies=[
        Guard(OperationVerb.VIEW, EssenceName.OPERATION, EssenceName.ESSENCE)
    ],
)
async def get_permission_manifest(
    request: Request,
    service: Annotated[
        PermissionManifestService, Depends(get_permission_manifest_service)
    ],
):
    """Live catalog of guarded endpoints + their required permissions + seed diff."""
    return await service.build(request.app)
