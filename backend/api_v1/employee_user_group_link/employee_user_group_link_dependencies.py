# backend/api_v1/employee_user_group_link/employee_user_group_link_dependencies.py
from fastapi import Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.db_helper import db_helper
from backend.api_v1.employee_user_group_link.employee_user_group_link_repository import (
    EmployeeUserGroupLinkRepository,
)
from backend.api_v1.employee_user_group_link.employee_user_group_link_service import (
    EmployeeUserGroupLinkService,
)
from backend.api_v1.employee_user_group_link.employee_user_group_link_schema import (
    EmployeeUserGroupLink as EmployeeUserGroupLinkSchema,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.auth.jwt_auth import get_current_active_auth_user


def get_employee_user_group_link_repository(
    session: AsyncSession = Depends(db_helper.session_getter),
) -> EmployeeUserGroupLinkRepository:
    return EmployeeUserGroupLinkRepository(session=session)


def get_employee_user_group_link_service(
    repository: EmployeeUserGroupLinkRepository = Depends(
        get_employee_user_group_link_repository
    ),
    user: EmployeeSchema = Depends(get_current_active_auth_user),
    session: AsyncSession = Depends(db_helper.session_getter),
) -> EmployeeUserGroupLinkService:
    return EmployeeUserGroupLinkService(
        repository=repository, user=user, session=session
    )


async def employee_user_group_link_by_id(
    employee_user_group_link_id: int,
    service: EmployeeUserGroupLinkService = Depends(
        get_employee_user_group_link_service
    ),
) -> EmployeeUserGroupLinkSchema:
    return await service.get_by_id(employee_user_group_link_id)


async def employee_user_group_link_by_composite_key(
    employee_id: int = Query(...),
    user_group_id: int = Query(...),
    service: EmployeeUserGroupLinkService = Depends(
        get_employee_user_group_link_service
    ),
) -> EmployeeUserGroupLinkSchema:
    return await service.get_by_composite_key(employee_id, user_group_id)
