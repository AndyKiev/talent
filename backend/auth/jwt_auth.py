from typing import Callable
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from backend.auth.auth_dependencies import validate_auth_user_ldap
from backend.auth import auth_utils as auth_utils
from backend.auth.auth_schemas import LDAPUser, AuthResponse
from backend.auth.permission_errors import PermissionDeniedSet
from backend.auth.permission_resolvers import resolve_user_is_bypass
from backend.api_v1.employee.employee_service import EmployeeService
from backend.api_v1.employee.employee_repository import EmployeeRepository
from backend.api_v1.msg_key.msg_key_model import MsgKey
from backend.api_v1.msg_pg.msg_model import Msg
from backend.database.db_helper import db_helper
from backend.api_v1.employee.employee_schema import EmployeeCreate, EmployeeSchema
from backend.utils.enums import OperationTypes, OperationVerb, EssenceName

# No import from user_dependency — that module imports us, so importing it
# here would create a circular dependency.
# We build UserService directly from a session wherever we need it.

router = APIRouter(prefix="/jwt", tags=["JWT"])

http_bearer = HTTPBearer()


class TokenInfo(BaseModel):
    access_token: str
    token_type: str


def _make_service(session: AsyncSession) -> EmployeeService:
    """Minimal service factory for use within jwt_auth only."""
    return EmployeeService(repository=EmployeeRepository(session=session))


def get_current_token_payload(
    credentials: HTTPAuthorizationCredentials = Depends(http_bearer),
) -> dict:
    token = credentials.credentials
    payload = auth_utils.decode_jwt(token=token)
    return payload


async def get_current_auth_user(
    payload: dict = Depends(get_current_token_payload),
    session: AsyncSession = Depends(db_helper.session_getter),
) -> EmployeeSchema:
    user_code: str | None = payload.get("sub")
    if not user_code:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )
    service = _make_service(session)
    orm_user = await service.repository.get_by_code(user_code)
    if not orm_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    schema = await service._to_schema(orm_user)
    # Superadmin bypass flag — computed from the same selectin-loaded user-group
    # relationships the permission resolvers use. (Ported from talent-test.)
    schema.is_bypass = resolve_user_is_bypass(orm_user)
    return schema


# jwt_auth.py — updated require_operation signature
def require_operation(operation: str | OperationTypes):
    name = operation.value if isinstance(operation, OperationTypes) else operation

    async def operation_dependency(
        current_user: EmployeeSchema = Depends(get_current_active_auth_user),
    ) -> EmployeeSchema:
        if name not in current_user.operations:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"User does not have permission for operation: {name}",
            )
        return current_user

    return operation_dependency


async def get_current_active_auth_user(
    user: EmployeeSchema = Depends(get_current_auth_user),
) -> EmployeeSchema:
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive employee",
        )
    return user


@router.post("/login", response_model=AuthResponse)
async def auth_user_issue_jwt(
    user_ldap: LDAPUser = Depends(validate_auth_user_ldap),
    session: AsyncSession = Depends(db_helper.session_getter),
):
    service = _make_service(session)
    orm_user = await service.repository.get_by_code(user_ldap.user_ukr)
    if not orm_user:
        try:
            orm_user = await service.create(
                EmployeeCreate(
                    code=user_ldap.user_ukr,
                    name=user_ldap.full_name,
                    email=None,
                    is_active=True,
                )
            )
        except IntegrityError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Login failed: employee record could not be created. "
                "Required reference data (job, status, lang) may be missing.",
            ) from e

    user_db = await service._to_schema(orm_user)
    jwt_payload = {
        "sub": user_db.code,
        "username": user_db.name,
        "user_ukr": user_ldap.user_ukr,
        "groups": user_ldap.group,
    }
    access_token = auth_utils.encode_jwt(jwt_payload)
    return AuthResponse(access_token=access_token, token_type="Bearer")


# @router.post("/login", response_model=AuthResponse)
# async def auth_user_issue_jwt(
#     user_ldap: LDAPUser = Depends(validate_auth_user_ldap),
#     session: AsyncSession = Depends(db_helper.session_getter),
# ):
#     service = _make_service(session)
#     orm_user = await service.repository.get_by_code(user_ldap.user_ukr)
#     if not orm_user:
#         orm_user = await service.create(
#             EmployeeCreate(
#                 code=user_ldap.user_ukr,
#                 name=user_ldap.full_name,
#                 email=None,
#                 is_active=True,
#             )
#         )
#
#     user_db = await service._to_schema(orm_user)
#
#     jwt_payload = {
#         "sub": user_db.code,
#         "username": user_db.name,
#         "user_ukr": user_ldap.user_ukr,
#         "groups": user_ldap.group,
#     }
#
#     access_token = auth_utils.encode_jwt(jwt_payload)
#     return AuthResponse(access_token=access_token, token_type="Bearer")


@router.get("/users/me")
async def auth_user_check_self_info(
    payload: dict = Depends(get_current_token_payload),
    user: EmployeeSchema = Depends(get_current_active_auth_user),
):
    return {
        "id": user.id,
        "code": user.code,
        "name": user.name,
        "email": user.email,
        "is_active": user.is_active,
        "job_id": user.job_id,
        "lang_id": user.lang_id,
        "job": user.job.model_dump() if user.job else None,
        "lang": user.lang.model_dump() if user.lang else None,
        "groups": user.groups,
        "operations": user.operations,
        "iat": payload.get("iat"),
        "exp": payload.get("exp"),
    }


# ── Access control: set-grain ─────────────────────────────────────────────────


async def _translate_permission_denied(
    exc: PermissionDeniedSet, lang_id: int, session: AsyncSession
) -> str:
    """
    Resolve the translated message for a PermissionDeniedSet exception.

    Mirrors BaseService._translate exactly:
      - join Msg → MsgKey by name, filter by lang_id
      - substitute ${var} placeholders with template_vars
      - fall back to the English string on any failure
    """
    try:
        stmt = (
            select(Msg.value)
            .join(MsgKey)
            .where(MsgKey.name == exc.message_key, Msg.lang_id == lang_id)
        )
        result = await session.execute(stmt)
        template = result.scalar_one_or_none()

        if not template:
            return exc.fallback

        for k, v in exc.template_vars.items():
            template = template.replace(f"${{{k}}}", str(v))
        return template
    except Exception:
        return exc.fallback


def has_access_set(
    operation: "str | OperationVerb",
    *essences: "str | EssenceName",
) -> Callable:
    """
    Set-grain FastAPI dependency factory.

    Usage:
        Depends(has_access_set(OperationVerb.LINK,
                               EssenceName.TALENT_STATUS,
                               EssenceName.TALENT_PERIOD))

    A grant for {A, B} is atomic — it does NOT satisfy a guard for {A} alone.
    A single essence is just a set of size one.

    On denial, raises HTTP 403 with the message translated into the user's
    language via the same Msg/MsgKey table used by domain errors.
    """
    op_name = operation.value if isinstance(operation, OperationVerb) else operation
    required_set = frozenset(
        e.value if isinstance(e, EssenceName) else e for e in essences
    )

    if not required_set:
        raise ValueError("has_access_set requires at least one essence.")

    async def _dependency(
        current_user: EmployeeSchema = Depends(get_current_active_auth_user),
        session: AsyncSession = Depends(db_helper.session_getter),
    ) -> EmployeeSchema:
        # Superadmin / bypass group skips every set-grain check.
        if getattr(current_user, "is_bypass", False):
            return current_user
        if (op_name, required_set) in current_user.permission_sets:
            return current_user

        exc = PermissionDeniedSet(op_name, sorted(required_set))
        translated = await _translate_permission_denied(
            exc, current_user.lang_id, session
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=translated,
        )

    return _dependency


# ── Backwards-compatibility shim ──────────────────────────────────────────────
# `has_access(verb, essence)` is the legacy single-essence API. We forward to
# has_access_set with a singleton set — semantics are identical.


def has_access(
    operation: "str | OperationVerb",
    essence: "str | EssenceName",
) -> Callable:
    """Legacy single-essence access guard. Forwards to has_access_set."""
    return has_access_set(operation, essence)
