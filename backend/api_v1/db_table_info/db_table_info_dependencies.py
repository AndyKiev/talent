from fastapi import Depends

from backend.api_v1.db_table_info.db_table_info_repository import (
    DbTableInfoRepository,
)
from backend.api_v1.db_table_info.db_table_info_service import (
    DbTableInfoService,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.auth.jwt_auth import get_current_active_auth_user


def get_db_table_info_repository() -> DbTableInfoRepository:
    return DbTableInfoRepository()


def get_db_table_info_service(
    repository: DbTableInfoRepository = Depends(get_db_table_info_repository),
    user: EmployeeSchema = Depends(get_current_active_auth_user),
) -> DbTableInfoService:
    return DbTableInfoService(repository=repository, user=user)
