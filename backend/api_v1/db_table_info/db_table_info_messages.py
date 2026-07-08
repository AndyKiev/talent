from backend.api_v1.base.errors import NotFoundError, DomainError
from backend.api_v1.base.success import DomainSuccess


class DbTableInfoNotFound(NotFoundError):
    message_key = "dbTableInfoNotFound"

    def __init__(self, table_name: str) -> None:
        self.template_vars = {"tableName": table_name}
        self.fallback = f"Table '{table_name}' not found in db_table_info"
        super().__init__("DbTableInfo", "table_name", table_name)


class DbTableInfoFileError(DomainError):
    message_key = "dbTableInfoFileError"

    def __init__(self, detail: str = "") -> None:
        self.fallback = f"Failed to read/write db_table_info file: {detail}"
        super().__init__(self.fallback)


class DbTableInfoRefreshSuccess(DomainSuccess):
    message_key = "dbTableInfoRefreshSuccess"

    def __init__(self, table_count: int) -> None:
        self.template_vars = {"tableCount": table_count}
        self.fallback = f"db_table_info refreshed: {table_count} tables"
        super().__init__(self.fallback)


class DbTableInfoUpdateSuccess(DomainSuccess):
    message_key = "dbTableInfoUpdateSuccess"

    def __init__(self, table_name: str) -> None:
        self.template_vars = {"tableName": table_name}
        self.fallback = f"Table '{table_name}' updated"
        super().__init__(self.fallback)


class DbTableInfoReorderSuccess(DomainSuccess):
    message_key = "dbTableInfoReorderSuccess"

    def __init__(self) -> None:
        self.fallback = "Table order updated"
        super().__init__(self.fallback)
