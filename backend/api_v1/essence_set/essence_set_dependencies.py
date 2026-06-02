# backend/api_v1/essence_set/essence_set_dependencies.py
#
# EssenceSet has no CRUD endpoints of its own — sets are created implicitly
# when a permission (OperationEssenceSetLink) is created, and read as part of
# a permission row. So this dependency exists to provide the service to *other*
# services (notably the permission service), not to a router.
#
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.essence_set.essence_set_repository import EssenceSetRepository
from backend.api_v1.essence_set.essence_set_service import EssenceSetService
from backend.database.db_helper import db_helper


async def get_essence_set_service(
    session: AsyncSession = Depends(db_helper.session_getter),
) -> EssenceSetService:
    return EssenceSetService(EssenceSetRepository(session), session=session)
