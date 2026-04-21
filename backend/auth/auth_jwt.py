from pathlib import Path

from pydantic import BaseModel

# from backend.config.config import BASE_DIR

BASE_DIR = Path(__file__).resolve().parents[2]
 

class AuthJWT(BaseModel):
    private_key_path: Path = BASE_DIR / "backend" / "auth" / "keys" / "private_key.pem"
    public_key_path: Path = BASE_DIR / "backend" / "auth" / "keys" / "public_key.pem"
    # algorithm: str = "RS256"
    # access_token_expire_minutes: int = 15
    algorithm: str
    access_token_expire_minutes: int
    expire_minutes: int
    max_cookies_age: int
    # refresh_token_expires_in: int = 3600