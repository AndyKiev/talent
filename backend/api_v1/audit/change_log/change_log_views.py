from fastapi import APIRouter, Depends, Query
from fastapi.security import HTTPBearer
from typing import Annotated, List, Optional

from backend.api_v1.audit.change_log.change_log_schema import (
    ChangeLogSchema,
    ChangeAction,
)
from backend.api_v1.audit.change_log.change_log_dependencies import (
    get_change_log_service,
)
from backend.api_v1.audit.change_log.change_log_service import ChangeLogService

from backend.auth.guards import Guard
from backend.utils.enums import OperationVerb, EssenceName

# -- Audit read API: change log entries ----------------------------------------
# Mounted at /audit/change_logs. Read-only flexible query over individual
# mutation entries (the per-run tree is served by /audit/change_sessions/{id}/logs).
router = APIRouter(
    prefix="/audit/change_logs",
    tags=["Audit - Change Log"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get(
    "",
    response_model=List[ChangeLogSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.CHANGE_LOG)],
)
async def list_change_logs(
    service: Annotated[ChangeLogService, Depends(get_change_log_service)],
    change_session_id: Optional[int] = Query(None, description="Entries of one run"),
    essence_key: Optional[str] = Query(
        None, description="e.g. employee_event, talent_audit_job"
    ),
    entity_id: Optional[int] = Query(None, description="PK of the changed row"),
    parent_id: Optional[int] = Query(
        None, description="Entries caused by this entry (cascade children)"
    ),
    action: Optional[ChangeAction] = Query(
        None, description="create | update | delete | apply | status_change | revert"
    ),
):
    """
    Flexible change_log query (chronological, id ascending). Examples:
      - one run's entries     → ?change_session_id=
      - one entity's history  → ?essence_key=talent_audit_job&entity_id=42
      - children of an entry   → ?parent_id=
    """
    return await service.get_logs(
        change_session_id=change_session_id,
        essence_key=essence_key,
        entity_id=entity_id,
        parent_id=parent_id,
        action=action.value if action else None,
    )
