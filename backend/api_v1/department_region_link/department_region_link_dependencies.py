from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.department_region_link.department_region_link_repository import (
    DepartmentRegionLinkRepository,
)
from backend.api_v1.department_region_link.department_region_link_schema import (
    DepartmentRegionLink as DepartmentRegionLinkSchema,
)
from backend.api_v1.department_region_link.department_region_link_service import (
    DepartmentRegionLinkService,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


def get_department_region_link_repository(
    session: AsyncSession = Depends(db_helper.session_getter),
) -> DepartmentRegionLinkRepository:
    return DepartmentRegionLinkRepository(session=session)


def get_department_region_link_service(
    repository: DepartmentRegionLinkRepository = Depends(
        get_department_region_link_repository
    ),
    user: EmployeeSchema = Depends(get_current_active_auth_user),
    session: AsyncSession = Depends(db_helper.session_getter),
) -> DepartmentRegionLinkService:
    return DepartmentRegionLinkService(
        repository=repository, user=user, session=session
    )


async def department_region_link_by_id(
    department_region_link_id: int,
    service: DepartmentRegionLinkService = Depends(get_department_region_link_service),
) -> DepartmentRegionLinkSchema:
    return await service.get_by_id(department_region_link_id)
