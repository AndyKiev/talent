from typing import Annotated

from fastapi import APIRouter, Depends

from backend.api_v1.process_roles.oversight_assignment.oversight_assignment_dependencies import (
    get_oversight_assignment_service,
)
from backend.api_v1.process_roles.oversight_assignment.oversight_assignment_schema import (
    OversightAssignmentReport,
    OversightAssignmentRunRequest,
)
from backend.api_v1.process_roles.oversight_assignment.oversight_assignment_service import (
    OversightAssignmentService,
)
from backend.auth.guards import Guard
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.utils.enums import EssenceName, OperationVerb

# Admin batch tool: auto-assign the oversight manager to the employees of a
# department subtree (writes process_role_holder_employee_links — same guard
# as the manual reviewer-assignment endpoints).
router = APIRouter(
    prefix="/admin/oversight_assignment",
    tags=["Oversight Assignment"],
    dependencies=[Depends(get_current_active_auth_user)],
)


@router.post(
    "/run",
    response_model=OversightAssignmentReport,
    dependencies=[Guard(OperationVerb.LINK, EssenceName.PROCESS_ROLE_HOLDER)],
)
async def run_oversight_assignment(
    payload: OversightAssignmentRunRequest,
    service: Annotated[
        OversightAssignmentService, Depends(get_oversight_assignment_service)
    ],
):
    return await service.run(payload)
