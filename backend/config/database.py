from pydantic import BaseModel


class BaseDatabaseConfig(BaseModel):
    debug: bool
    user: str
    host: str
    port: int
    password: str
    user_test: str
    password_test: str
    @property
    def url(self) -> str:
        return f"oracle+oracledb://{self.user}:{self.password}@{self.host}:{self.port}/{self.sid}"


class BaseDatabaseOracleConfig(BaseDatabaseConfig):
    sid: str
    @property
    def url(self) -> str:
        return f"oracle+oracledb://{self.user}:{self.password}@{self.host}:{self.port}/{self.sid}"
    @property
    def active_url(self) -> str:
        if self.debug:
            return f"oracle+oracledb://{self.user_test}:{self.password_test}@{self.host}:{self.port}/{self.sid}"
        return self.url


class BaseDatabasePostgres(BaseDatabaseConfig):
    name: str  # was: sid
    @property
    def url(self) -> str:
        return f"postgresql+asyncpg://{self.user}:{self.password}@{self.host}:{self.port}/{self.name}"
    @property
    def active_url(self) -> str:
        if self.debug:
            return f"postgresql+asyncpg://{self.user_test}:{self.password_test}@{self.host}:{self.port}/{self.name}"
        return self.url


class TalentDatabaseConfig(BaseDatabasePostgres):
    echo: bool = False
    echo_pool: bool = False
    naming_convention: dict[str, str] = {
        "ix": "ix_%(column_0_label)s",
        "uq": "uq_%(table_name)s_%(column_0_N_name)s",
        "ck": "ck_%(table_name)s_%(constraint_name)s",
        "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
        "pk": "pk_%(table_name)s",
    }