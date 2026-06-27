from fastapi import Depends

from backend.api_v1.db_table_info.db_table_info_repository import (
    DbTableInfoRepository,
)
from backend.api_v1.db_table_info.db_table_info_service import (
    DbTableInfoService,
)


def get_db_table_info_repository() -> DbTableInfoRepository:
    return DbTableInfoRepository()


def get_db_table_info_service(
    repository: DbTableInfoRepository = Depends(get_db_table_info_repository),
) -> DbTableInfoService:
    return DbTableInfoService(repository=repository)
