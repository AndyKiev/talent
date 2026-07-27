import os

from fastapi import Form, HTTPException, Request, status
from jwt import PyJWTError
from ldap3.core.exceptions import LDAPBindError, LDAPSessionTerminatedByServerError

from backend.auth.auth_schemas import LDAPUser, TokenUser  # Use the new schemas
from backend.auth.auth_utils import decode_jwt
from backend.auth.ldap_connection import authenticate_ldap
from backend.config import settings

_BYPASS_LDAP = os.environ.get("BYPASS_LDAP", "false").lower() == "true"


async def validate_auth_user_ldap(
    username: str = Form(),
    password: str = Form(),
) -> LDAPUser:

    if username:
        username = username.upper()

    if _BYPASS_LDAP:
        # Dev bypass: accept any employee code as username, skip LDAP
        return LDAPUser(user_ukr=username, full_name=username, group=[])

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
    except Exception:
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


# def require_operations(required_operations: List[str]):
#     def decorator(func: Callable):
#         @wraps(func)
#         async def wrapper(request: Request, *args, **kwargs):
#             employee = await current_user_by_token(request)
#             print("employee", employee)
#             if not any(
#                 operation in required_operations for operation in employee.operations
#             ):
#                 raise HTTPException(
#                     status_code=status.HTTP_403_FORBIDDEN,
#                     detail=settings.exc_desc.client.forbidden,
#                 )
#
#             return await func(request, *args, **kwargs)
#
#         return wrapper
#
#     return decorator


#
# def require_groups(required_groups: List[str]):
#     def decorator(func: Callable):
#         @wraps(func)
#         async def wrapper(request: Request, *args, **kwargs):
#             # Manually create dependencies
#             async for session in db_helper_sqlite.scoped_session_dependency():
#                 print(session)
#                 crud = UserCRUD(session)
#                 print(crud)
#                 token_user: dict = get_current_token_payload()
#
#                 print(token_user)
#                 user_code = getattr(token_user, "user_ukr", None)
#
#                 if not user_code:
#                     raise HTTPException(
#                         status_code=status.HTTP_401_UNAUTHORIZED,
#                         detail="User code not found in token",
#                     )
#
#                 employee = await crud.get_user_by_code(user_code)
#                 if not employee:
#                     raise HTTPException(
#                         status_code=status.HTTP_401_UNAUTHORIZED,
#                         detail="User not found in database",
#                     )
#
#                 user_groups = employee.groups or []
#                 if not any(group in required_groups for group in user_groups):
#                     raise HTTPException(
#                         status_code=status.HTTP_403_FORBIDDEN,
#                         detail="Insufficient permissions",
#                     )
#
#                 return await func(request, *args, **kwargs)
#
#         return wrapper
#
#     return decorator
