from pydantic import BaseModel


class BaseDatabaseConfig(BaseModel):
    user: str
    host: str
    port: int
    password: str
    sid: str

    @property
    def url(self) -> str:
        return f"oracle+oracledb://{self.user}:{self.password}@{self.host}:{self.port}/{self.sid}"


class TalentDatabaseConfig(BaseDatabaseConfig):
    debug: bool
    user_test: str
    password_test: str
    echo: bool = False
    echo_pool: bool = False

    naming_convention: dict[str, str] = {
        "ix": "ix_%(column_0_label)s",
        "uq": "uq_%(table_name)s_%(column_0_N_name)s",
        "ck": "ck_%(table_name)s_%(constraint_name)s",
        "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
        "pk": "pk_%(table_name)s",
    }