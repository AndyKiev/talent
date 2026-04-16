from functools import wraps
from typing import Annotated, Callable, List

from fastapi import Form, HTTPException, Request, status, Depends
from jwt import PyJWTError
from ldap3.core.exceptions import LDAPBindError, LDAPSessionTerminatedByServerError


from backend.auth.auth_utils import decode_jwt
from backend.auth import authenticate_ldap
from backend.auth.auth_schemas import LDAPUser, TokenUser  # Use the new schemas
from backend.config.config import settings


# IF TYPE_CHECKING:
#     from backend.auth.jwt_auth import get_current_token_payload


async def validate_auth_user_ldap(
    username: str = Form(),
    password: str = Form(),
) -> LDAPUser:

    if username:
        username = username.upper()

    try:
        ldap_user_data = authenticate_ldap(username=username, password=password)
        return LDAPUser(**ldap_user_data)
    except LDAPBindError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=settings.exc_desc.client.not_unauthorized,
        )
    except LDAPSessionTerminatedByServerError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=settings.exc_desc.server.internal_server_error,
        )


async def current_user_by_token(
    request: Request,
) -> TokenUser:
    access_token = request.cookies.get("access_token")
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=settings.exc_desc.client.not_unauthorized,
        )
    try:
        payload = decode_jwt(access_token)
        print("payload", payload)
        return TokenUser(**payload)
    except PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=settings.exc_desc.client.not_unauthorized,
        )
