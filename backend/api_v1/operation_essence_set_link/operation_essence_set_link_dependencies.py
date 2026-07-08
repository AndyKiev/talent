# backend/api_v1/operation_essence_set_link/operation_essence_set_link_dependencies.py
from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated

from backend.api_v1.operation_essence_set_link.operation_essence_set_link_repository import (
    OperationEssenceSetLinkRepository,
)
from backend.api_v1.operation_essence_set_link.operation_essence_set_link_service import (
    OperationEssenceSetLinkService,
)
from backend.api_v1.essence_set.essence_set_repository import EssenceSetRepository
from backend.api_v1.essence_set.essence_set_service import EssenceSetService
from backend.database.db_helper import db_helper


async def get_operation_essence_set_link_service(
    session: AsyncSession = Depends(db_helper.session_getter),
) -> OperationEssenceSetLinkService:
    # Both services share the same session so set creation and permission
    # creation commit together.
    essence_set_service = EssenceSetService(
        EssenceSetRepository(session), session=session
    )
    return OperationEssenceSetLinkService(
        OperationEssenceSetLinkRepository(session),
        essence_set_service=essence_set_service,
        session=session,
    )


async def operation_essence_set_link_by_id(
    link_id: int,
    service: Annotated[
        OperationEssenceSetLinkService,
        Depends(get_operation_essence_set_link_service),
    ],
):
    from backend.api_v1.operation_essence_set_link.operation_essence_set_link_messages import (
        OperationEssenceSetLinkNotFound,
    )

    try:
        return await service.get_by_id(link_id)
    except OperationEssenceSetLinkNotFound as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=exc.fallback)
