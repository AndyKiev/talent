from backend.api_v1.base.success import DomainSuccess


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
