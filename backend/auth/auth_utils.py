from datetime import UTC, datetime, timedelta

import bcrypt
import jwt
from fastapi import HTTPException, status
from jwt.exceptions import InvalidTokenError

from backend.config.config import settings

# Token type discriminator embedded in every JWT we issue. The access path and
# the refresh path each accept ONLY their own type, so a refresh token can never
# be replayed as an access token (and vice-versa).
TOKEN_TYPE_FIELD = "type"
ACCESS_TOKEN_TYPE = "access"
REFRESH_TOKEN_TYPE = "refresh"


# we issue token with encode_jwt and make signature with private key
def encode_jwt(
    payload: dict,
    private_key: str = settings.auth_jwt.private_key_path.read_text(),
    algorithm: str = settings.auth_jwt.algorithm,
    expire_minutes: int = settings.auth_jwt.access_token_expire_minutes,
    expire_timedelta: timedelta | None = None,
):
    to_encode = payload.copy()
    now = datetime.now(UTC)
    if expire_timedelta:
        expire = now + expire_timedelta
    else:
        expire = now + timedelta(minutes=expire_minutes)
    to_encode.update(
        exp=expire,
        iat=now,
    )
    encoded = jwt.encode(to_encode, private_key, algorithm)
    return encoded


# we read token with decode_jwt using public key to get all required info about current employee (the
# information that we have set to this employee on our own
def decode_jwt(
    token: str | bytes,
    public_key: str = settings.auth_jwt.public_key_path.read_text(),
    algorithm: str = settings.auth_jwt.algorithm,
):

    try:
        decoded = jwt.decode(token, public_key, algorithms=[algorithm])
    except InvalidTokenError:
        # this error means the structure_frontend of token is not correct. for example it is not split by three dots
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            # detail=f"invalid token error: {e}",
            detail="invalid token error",
        )
    return decoded


def create_access_token(payload: dict) -> str:
    """Short-lived token used as the Bearer credential on every request."""
    to_encode = {TOKEN_TYPE_FIELD: ACCESS_TOKEN_TYPE, **payload}
    return encode_jwt(
        to_encode,
        expire_minutes=settings.auth_jwt.access_token_expire_minutes,
    )


def create_refresh_token(sub: str) -> str:
    """Long-lived token whose only job is to mint new access tokens."""
    to_encode = {TOKEN_TYPE_FIELD: REFRESH_TOKEN_TYPE, "sub": sub}
    return encode_jwt(
        to_encode,
        expire_timedelta=timedelta(days=settings.auth_jwt.refresh_token_expire_days),
    )


def validate_token_type(payload: dict, expected_type: str) -> None:
    """Reject a token presented on the wrong path (e.g. a refresh token used
    as a Bearer access token). Raises 401 on mismatch."""
    if payload.get(TOKEN_TYPE_FIELD) != expected_type:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
        )


def hash_password(password: str) -> bytes:
    salt = bcrypt.gensalt()
    pwd_bytes = password.encode()
    return bcrypt.hashpw(pwd_bytes, salt)


def validate_password(password: str, hashed_password: bytes) -> bool:
    return bcrypt.checkpw(
        password=password.encode(),
        hashed_password=hashed_password,
    )
