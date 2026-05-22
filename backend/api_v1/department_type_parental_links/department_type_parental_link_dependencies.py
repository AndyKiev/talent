from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from backend.database.db_helper import db_helper
from backend.api_v1.department_type_parental_links.department_type_parental_link_repository import DepartmentTypeParentalLinkRepository
from backend.api_v1.department_type_parental_links.department_type_parental_link_service import DepartmentTypeParentalLinkService
from backend.api_v1.department_type_parental_links.department_type_parental_link_schema import (
    DepartmentTypeParentalLink as DepartmentTypeParentalLinkSchema,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.auth.jwt_auth import get_current_active_auth_user

def get_department_type_parental_link_repository(
    session: AsyncSession = Depends(db_helper.session_getter),
) -> DepartmentTypeParentalLinkRepository:
    return DepartmentTypeParentalLinkRepository(session=session)

def get_department_type_parental_link_service(
    repository: DepartmentTypeParentalLinkRepository = Depends(get_department_type_parental_link_repository),
    user: EmployeeSchema = Depends(get_current_active_auth_user),
    session: AsyncSession = Depends(db_helper.session_getter),
) -> DepartmentTypeParentalLinkService:
    return DepartmentTypeParentalLinkService(repository=repository, user=user, session=session)

async def get_link_by_id(
    link_id: int,
    service: DepartmentTypeParentalLinkService = Depends(get_department_type_parental_link_service),
) -> DepartmentTypeParentalLinkSchema:
    return await service.get_by_id(link_id)