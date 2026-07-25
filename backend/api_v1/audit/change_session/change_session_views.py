from typing import Annotated

from fastapi import APIRouter, Depends, Query
from fastapi.security import HTTPBearer

from backend.api_v1.audit.change_log.change_log_dependencies import (
    get_change_log_service,
)
from backend.api_v1.audit.change_log.change_log_schema import ChangeLogSchema
from backend.api_v1.audit.change_log.change_log_service import ChangeLogService
from backend.api_v1.audit.change_session.change_session_dependencies import (
    change_session_by_id,
    get_change_session_service,
)
from backend.api_v1.audit.change_session.change_session_schema import (
    ChangeRunStatus,
    ChangeSessionSchema,
    ChangeSource,
)
from backend.api_v1.audit.change_session.change_session_service import (
    ChangeSessionService,
)
from backend.auth.guards import Guard
from backend.utils.enums import EssenceName, OperationVerb

# -- Audit read API: change sessions (runs) ------------------------------------
# Mounted at /audit/change_sessions. Read-only — runs are written by the
# services that perform the work (apply / delete / revert / celery sweep).
router = APIRouter(
    prefix="/audit/change_sessions",
    tags=["Audit - Change Sessions"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get(
    "",
    response_model=list[ChangeSessionSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.CHANGE_SESSION)],
)
async def list_change_sessions(
    service: Annotated[ChangeSessionService, Depends(get_change_session_service)],
    source: ChangeSource | None = Query(
        None, description="Filter by source: manual | system"
    ),
    run_status: ChangeRunStatus | None = Query(
        None,
        alias="status",
        description="Filter by run status: running | success | failed",
    ),
    limit: int | None = Query(
        None, ge=1, le=1000, description="Cap on rows returned (newest first)"
    ),
):
    """
    Audit runs, newest first. Celery sweeps appear as `system` runs (with their
    `summary` stats); manual actions as `manual` runs (with the triggering user).
    """
    return await service.get_change_sessions(
        source=source.value if source else None,
        status=run_status.value if run_status else None,
        limit=limit,
    )


@router.get(
    "/{change_session_id}",
    response_model=ChangeSessionSchema,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.CHANGE_SESSION)],
)
async def get_change_session(
    record: ChangeSessionSchema = Depends(change_session_by_id),
):
    return record


@router.get(
    "/{change_session_id}/logs",
    response_model=list[ChangeLogSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.CHANGE_LOG)],
)
async def get_change_session_logs(
    change_session_id: int,
    service: Annotated[ChangeLogService, Depends(get_change_log_service)],
):
    """
    All change_log rows for a run, chronological (id ascending). The client
    builds the parent/children tree from `parent_id` — e.g. talent reversals
    nested under the apply/delete entry that caused them.
    """
    return await service.get_logs(change_session_id=change_session_id)
