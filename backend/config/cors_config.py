from pydantic_settings import BaseSettings


class CORSConfig(BaseSettings):
    origins: list[str]
    credentials: bool
    # methods: list = ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"]
    methods: list = ["*"]
    headers: list = ["*"]
