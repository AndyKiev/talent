from pathlib import Path

from pydantic import BaseModel

# from backend.config.config import BASE_DIR

BASE_DIR = Path(__file__).resolve().parents[2]


class AuthJWT(BaseModel):
    # private_key_path: Path = BASE_DIR / "backend" / "certs" / "jwt-private.pem"
    # public_key_path: Path = BASE_DIR / "backend" / "certs" / "jwt-public.pem"
    private_key_path: Path = BASE_DIR / "backend" / "auth" / "keys" / "jwt-private.pem"
    public_key_path: Path = BASE_DIR / "backend" / "auth" / "keys" / "jwt-public.pem"
    # algorithm: str = "RS256"
    # access_token_expire_minutes: int = 15
    algorithm: str
    access_token_expire_minutes: int
    expire_minutes: int
    max_cookies_age: int
    # refresh_token_expires_in: int = 3600
