from backend.api_v1.base.errors import NotFoundError, DomainError


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
