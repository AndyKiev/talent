from pydantic_settings import BaseSettings


class CORSConfig(BaseSettings):
    origins: str
    credentials: bool
    methods: list = ["*"]
    headers: list = ["*"]
