from pydantic_settings import BaseSettings


class RedisClient(BaseSettings):
    host: str
    port: int
    db: int = 0
    expires: int

    @property
    def celery_url_backend(self) -> str:
        return f"redis://{self.host}:{self.port}/{self.db}"
