# backend/api_v1/permission_manifest/permission_manifest_dependencies.py
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.permission_manifest.permission_manifest_service import (
    PermissionManifestService,
)
from backend.database.db_helper import db_helper


async def get_permission_manifest_service(
    session: AsyncSession = Depends(db_helper.session_getter),
) -> PermissionManifestService:
    return PermissionManifestService(session=session)
