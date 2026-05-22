from pydantic import BaseModel


class SshTunnelConfig(BaseModel):
    host: str
    port: int
    user: str
    password: str
