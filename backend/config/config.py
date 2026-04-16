from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


# from backend.config.api_prefix import ApiPrefix
# from backend.config.auth_jwt import AuthJWT
from backend.config.cors_config import CORSConfig
from backend.database.database import TalentDatabaseConfig
from backend.config.ldap import LdapConfig
from backend.config.log_config import LogConfig
from backend.config.run_config import RunConfig
from backend.config.redis_client import RedisClient
from backend.config.email_param_config import (
    LocalSmtpConfig,
    SenderMailConfig,
    LoaderErrorMailConfig,
    LogMailConfig,
    # ReceiverMailConfig,
)

# BACKEND_DIR = Path(__file__).resolve().parents[1]
BASE_DIR = Path(__file__).resolve().parents[2]

class AuthJwtSettings(BaseSettings):
    private_key_path: Path = Path("backend/auth/keys/private_key.pem")
    public_key_path: Path = Path("backend/auth/keys/public_key.pem")
    algorithm: str = "RS256"
    access_token_expire_minutes: int = 30
    expire_minutes: int = 300  # Add this field
    max_cookies_age: int = 10000000  # Add this field
    
    class Config:
        extra = "ignore"  # This will ignore any extra fields

class Settings(BaseSettings):
        
    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        case_sensitive=False,
        env_nested_delimiter="__",
        env_prefix="APP_CONFIG__",
        extra="ignore",
    )
    auth_jwt: AuthJwtSettings = AuthJwtSettings()
    api_v1_prefix: str = "/api/v1"
    run: RunConfig
    db: TalentDatabaseConfig
    cors: CORSConfig
    ldap: LdapConfig
    redis: RedisClient
    log_config: LogConfig
    # auth_jwt: AuthJWT
    # api_prefix: ApiPrefix = ApiPrefix()

    local_smtp: LocalSmtpConfig
    loader_error_mail: LoaderErrorMailConfig
    sender_mail: SenderMailConfig = SenderMailConfig()
    log_mail: LogMailConfig
    # receiver_mail: ReceiverMailConfig = ReceiverMailConfig()
    # rabbitmq: RabbitMqConfi

    # def __init__(self, **kwargs):
    #     super().__init__(**kwargs)
    #     self._adjust_db_user_based_on_debug()
    #
    # def _adjust_db_user_based_on_debug(self):
    #     if self.db.debug:
    #         self.db.user = self.db.user_test
    #         self.db.password = self.db.password_test


settings = Settings()
# print("log_mail.recipient", settings.log_mail.recipient)
# print(settings.db_meti_central.url)
# print("CORS Origins:", settings.cors.origins)
# print("CORS Credentials:", settings.cors.credentials)
# print("CORS Methods:", settings.cors.methods)
# print("CORS Headers:", settings.cors.headers)
