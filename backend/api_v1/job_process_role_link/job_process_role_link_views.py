from typing import Annotated

from fastapi import APIRouter, Depends, status
from fastapi.security import HTTPBearer

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.job_process_role_link.job_process_role_link_dependencies import (
    get_job_process_role_link_service,
)
from backend.api_v1.job_process_role_link.job_process_role_link_schema import (
    JobProcessRoleLink as JobProcessRoleLinkSchema,
)
from backend.api_v1.job_process_role_link.job_process_role_link_schema import (
    JobProcessRoleLinkCreate,
    SetLinkDepartmentTypes,
)
from backend.api_v1.job_process_role_link.job_process_role_link_service import (
    JobProcessRoleLinkService,
)
from backend.auth.guards import Guard
from backend.utils.enums import EssenceName, OperationVerb

router = APIRouter(
    prefix="/job_process_role_links",
    tags=["Job ↔ Process Role Links"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get(
    "/job/{job_id}",
    response_model=list[JobProcessRoleLinkSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.JOB)],
)
async def get_links_for_job(
    job_id: int,
    service: Annotated[
        JobProcessRoleLinkService, Depends(get_job_process_role_link_service)
    ],
):
    """Return all process-role links for a given job."""
    return await service.get_links_for_job(job_id)


@router.post(
    "",
    response_model=MutationResponse[JobProcessRoleLinkSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.LINK, EssenceName.JOB)],
)
async def add_link(
    payload: JobProcessRoleLinkCreate,
    service: Annotated[
        JobProcessRoleLinkService, Depends(get_job_process_role_link_service)
    ],
):
    """
    Link a job to a process role.

    Raises **JobAlreadyLinkedToProcessRole** if the link already exists.
    """
    return await service.add_link(payload)


@router.put(
    "/{link_id}/department_types",
    response_model=MutationResponse[JobProcessRoleLinkSchema],
    dependencies=[Guard(OperationVerb.LINK, EssenceName.JOB)],
)
async def set_link_department_types(
    link_id: int,
    payload: SetLinkDepartmentTypes,
    service: Annotated[
        JobProcessRoleLinkService, Depends(get_job_process_role_link_service)
    ],
):
    """Replace the oversight-target department types of a job↔role link."""
    return await service.set_department_types(link_id, payload)


@router.delete(
    "/job/{job_id}/process_role/{process_role_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.LINK, EssenceName.JOB)],
)
async def remove_link(
    job_id: int,
    process_role_id: int,
    service: Annotated[
        JobProcessRoleLinkService, Depends(get_job_process_role_link_service)
    ],
):
    """Remove a job ↔ process-role link."""
    await service.remove_link(job_id, process_role_id)
