from fastapi import Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.db_helper import db_helper
from backend.api_v1.department_type_job_link.department_type_job_link_repository import (
    DepartmentTypeJobLinkRepository,
)
from backend.api_v1.department_type_job_link.department_type_job_link_service import (
    DepartmentTypeJobLinkService,
)
from backend.api_v1.department_type_job_link.department_type_job_link_schema import (
    DepartmentTypeJobLink as DepartmentTypeJobLinkSchema,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.auth.jwt_auth import get_current_active_auth_user


def get_department_type_job_link_repository(
    session: AsyncSession = Depends(db_helper.session_getter),
) -> DepartmentTypeJobLinkRepository:
    return DepartmentTypeJobLinkRepository(session=session)


def get_department_type_job_link_service(
    repository: DepartmentTypeJobLinkRepository = Depends(get_department_type_job_link_repository),
    user: EmployeeSchema = Depends(get_current_active_auth_user),
    session: AsyncSession = Depends(db_helper.session_getter),
) -> DepartmentTypeJobLinkService:
    return DepartmentTypeJobLinkService(repository=repository, user=user, session=session)


async def department_type_job_link_by_id(
    department_type_job_link_id: int,
    service: DepartmentTypeJobLinkService = Depends(get_department_type_job_link_service),
) -> DepartmentTypeJobLinkSchema:
    return await service.get_by_id(department_type_job_link_id)


async def department_type_job_link_by_composite_key(
    department_type_id: int = Query(...),
    job_id: int = Query(...),
    service: DepartmentTypeJobLinkService = Depends(get_department_type_job_link_service),
) -> DepartmentTypeJobLinkSchema:
    return await service.get_by_composite_key(department_type_id, job_id)
