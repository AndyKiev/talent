from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.region.region_repository import RegionRepository
from backend.api_v1.region.region_schema import Region as RegionSchema
from backend.api_v1.region.region_service import RegionService
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


def get_region_repository(
    session: AsyncSession = Depends(db_helper.session_getter),
) -> RegionRepository:
    return RegionRepository(session=session)


def get_region_service(
    repository: RegionRepository = Depends(get_region_repository),
    user: EmployeeSchema = Depends(get_current_active_auth_user),
    session: AsyncSession = Depends(db_helper.session_getter),
) -> RegionService:
    return RegionService(repository=repository, user=user, session=session)


async def region_by_id(
    region_id: int,
    service: RegionService = Depends(get_region_service),
) -> RegionSchema:
    return await service.get_by_id(region_id)
