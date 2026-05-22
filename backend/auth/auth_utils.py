from fastapi import HTTPException, status

from jwt.exceptions import InvalidTokenError
from datetime import timedelta, UTC, datetime

import bcrypt

import jwt
from backend.config.config import settings


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
    except InvalidTokenError as e:
        # this error means the structure_frontend of token is not correct. for example it is not split by three dots
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            # detail=f"invalid token error: {e}",
            detail=f"invalid token error",
        )
    return decoded


def hash_password(password: str) -> bytes:
    salt = bcrypt.gensalt()
    pwd_bytes = password.encode()
    return bcrypt.hashpw(pwd_bytes, salt)


def validate_password(password: str, hashed_password: bytes) -> bool:
    return bcrypt.checkpw(
        password=password.encode(),
        hashed_password=hashed_password,
    )
