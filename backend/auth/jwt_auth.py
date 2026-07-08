import re
from typing import Callable
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.auth.auth_dependencies import validate_auth_user_ldap
from backend.auth import auth_utils as auth_utils
from backend.auth.auth_schemas import LDAPUser, AuthResponse, RefreshRequest
from backend.auth.permission_errors import PermissionDeniedSet
from backend.auth.permission_resolvers import resolve_user_is_bypass
from backend.api_v1.employee.employee_service import EmployeeService
from backend.api_v1.employee.employee_repository import EmployeeRepository
from backend.api_v1.msg_key.msg_key_model import MsgKey
from backend.api_v1.msg_pg.msg_model import Msg
from backend.database.db_helper import db_helper
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.utils.enums import OperationTypes, OperationVerb, EssenceName

# No import from user_dependency — that module imports us, so importing it
# here would create a circular dependency.
# We build UserService directly from a session wherever we need it.

router = APIRouter(prefix="/jwt", tags=["JWT"])

http_bearer = HTTPBearer()


def _make_service(session: AsyncSession) -> EmployeeService:
    """Minimal service factory for use within jwt_auth only."""
    return EmployeeService(repository=EmployeeRepository(session=session))


def get_current_token_payload(
    credentials: HTTPAuthorizationCredentials = Depends(http_bearer),
) -> dict:
    token = credentials.credentials
    payload = auth_utils.decode_jwt(token=token)
    # A refresh token must never be accepted as a Bearer access credential.
    auth_utils.validate_token_type(payload, auth_utils.ACCESS_TOKEN_TYPE)
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
    # Slim load: identity + permission chain only. A full profile load fires
    # the whole selectin relationship web (~250 queries) on EVERY request —
    # guards never read job/departments, and /users/me refetches full.
    orm_user = await service.repository.get_by_code_for_auth(user_code)
    if not orm_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    schema = await service._to_auth_schema(orm_user)
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
    orm_user = await service.repository.get_by_code_for_auth(user_ldap.user_ukr)
    if not orm_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Employee record not found. Contact an administrator.",
        )

    user_db = await service._to_auth_schema(orm_user)
    access_token = auth_utils.create_access_token(
        {
            "sub": user_db.code,
            "username": user_db.name,
            "user_ukr": user_ldap.user_ukr,
            "groups": user_ldap.group,
        }
    )
    refresh_token = auth_utils.create_refresh_token(sub=user_db.code)
    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="Bearer",
    )


# ── Self-registration (pre-auth) ──────────────────────────────────────────────
# Gated by the `self_registration_enabled` app setting (developer Settings).
# Creates the employee RECORD only — it is not an auth bypass: logging in still
# goes through LDAP (or the dev BYPASS). The new employee lands with
# is_active=true, status "pending" and no job; an admin assigns the rest.

ALLOWED_REGISTRATION_DOMAINS = ("auchan.ua", "auchan.fr")
SELF_REGISTRATION_SETTING = "self_registration_enabled"
# "UKR" + 1-7 uppercase letters/digits (e.g. UKR7101004). Mirrors the zod
# regex in LoginPage.tsx — keep both in sync if the convention ever changes.
EMPLOYEE_CODE_REGEX = re.compile(r"^UKR[A-Z0-9]{1,7}$")


class RegisterConfig(BaseModel):
    enabled: bool
    domains: list[str]


class RegisterRequest(BaseModel):
    code: str
    name: str
    email: str


@router.get("/register_config", response_model=RegisterConfig)
async def registration_config(
    session: AsyncSession = Depends(db_helper.session_getter),
):
    """Public: tells the login page whether to show the Register option."""
    from backend.api_v1.app_setting.app_setting_service import get_bool_setting

    enabled = await get_bool_setting(session, SELF_REGISTRATION_SETTING, default=False)
    return RegisterConfig(enabled=enabled, domains=list(ALLOWED_REGISTRATION_DOMAINS))


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_employee(
    body: RegisterRequest,
    session: AsyncSession = Depends(db_helper.session_getter),
):
    from backend.api_v1.app_setting.app_setting_service import get_bool_setting
    from backend.api_v1.employee.employee_schema import EmployeeCreate
    from backend.api_v1.employee_status.employee_status_model import EmployeeStatus
    from sqlalchemy import func

    enabled = await get_bool_setting(session, SELF_REGISTRATION_SETTING, default=False)
    if not enabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Self-registration is disabled.",
        )

    code = body.code.strip().upper()
    name = body.name.strip()
    email = body.email.strip().lower()
    if not EMPLOYEE_CODE_REGEX.match(code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Employee code must start with UKR followed by 1-7 letters/digits (e.g. UKR7101004).",
        )
    if not name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Name is required.",
        )
    local_part, _, domain = email.partition("@")
    if not local_part or domain not in ALLOWED_REGISTRATION_DOMAINS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email must belong to an allowed domain: "
            + ", ".join(ALLOWED_REGISTRATION_DOMAINS),
        )

    service = _make_service(session)
    if await service.repository.get_by_code_for_auth(code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An employee with this code already exists.",
        )

    # Create the person behind the employee (LAST FIRST [PATRONYMIC] split,
    # best-effort for free-form input). Self-registration never dead-ends on a
    # namesake (dedupe number assigned); single-token names fall back to the
    # whole string for both parts (NOT NULL) and get fixed by an admin later.
    from backend.api_v1.person.person_model import Person
    from backend.api_v1.person.person_repository import PersonRepository
    from backend.utils.person_names import (
        split_employee_full_name,
        normalize_name_part,
        build_employee_name,
    )

    last_raw, first_raw, patronymic_raw = split_employee_full_name(name)
    last = normalize_name_part(last_raw)
    first = normalize_name_part(first_raw)
    patronymic = normalize_name_part(patronymic_raw)
    first = first or normalize_name_part(name)
    last = last or normalize_name_part(name)
    person_repo = PersonRepository(session=session)
    dedupe_no = await person_repo.get_next_dedupe_no(first, last)
    person = await person_repo.create(
        Person(
            first_name=first,
            last_name=last,
            patronymic=patronymic,
            name_dedupe_no=dedupe_no,
        )
    )

    derived_name = build_employee_name(last, first)
    try:
        orm_user = await service.create(
            EmployeeCreate(
                code=code,
                name=derived_name,
                email=email,
                is_active=True,
                job_id=None,
                person_id=person.id,
            )
        )
    except Exception:
        await person_repo.delete_by_id(person.id)
        raise
    # Status: resolve "pending" by name (model default is id=1 which is the same
    # row in the seeded DB — this keeps it correct even if ids drift).
    pending_id = await session.scalar(
        select(EmployeeStatus.id).where(func.lower(EmployeeStatus.name) == "pending")
    )
    if pending_id and orm_user.status_id != pending_id:
        orm_user.status_id = pending_id
        await session.commit()

    return {"detail": "Registration successful. You can now log in."}


@router.post("/refresh", response_model=AuthResponse)
async def auth_refresh_access_token(
    body: RefreshRequest,
    session: AsyncSession = Depends(db_helper.session_getter),
):
    """Exchange a valid refresh token for a fresh access + refresh token pair.

    Access-token claims are rebuilt from the DB so a renamed/regrouped
    (or removed/deactivated) user is reflected on the next refresh. The
    refresh token is rotated: each successful refresh returns a new one with
    a fresh expiry (sliding session). Tokens stay stateless — a previously
    issued refresh token remains valid until its own expiry.
    """
    payload = auth_utils.decode_jwt(token=body.refresh_token)
    auth_utils.validate_token_type(payload, auth_utils.REFRESH_TOKEN_TYPE)

    user_code: str | None = payload.get("sub")
    if not user_code:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    service = _make_service(session)
    orm_user = await service.repository.get_by_code_for_auth(user_code)
    if not orm_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    # A deactivated employee must not be able to keep minting access tokens
    # from an old refresh token (mirrors get_current_active_auth_user).
    if not orm_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive employee",
        )

    user_db = await service._to_auth_schema(orm_user)
    access_token = auth_utils.create_access_token(
        {
            "sub": user_db.code,
            "username": user_db.name,
            "user_ukr": user_db.code,
            "groups": user_db.groups,
        }
    )
    refresh_token = auth_utils.create_refresh_token(sub=user_db.code)
    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="Bearer",
    )


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
    session: AsyncSession = Depends(db_helper.session_getter),
):
    # The auth dependency is a slim load (no job/lang relationships) — refetch
    # the full profile here. /users/me runs once per app mount, so the heavy
    # relationship load is paid exactly once instead of on every request.
    service = _make_service(session)
    orm_user = await service.repository.get_by_code(user.code)
    full = await service._to_schema(orm_user)
    return {
        "id": full.id,
        "code": full.code,
        "name": full.name,
        "email": full.email,
        "is_active": full.is_active,
        "job_id": full.job_id,
        "lang_id": full.lang_id,
        "job": full.job.model_dump() if full.job else None,
        "lang": full.lang.model_dump() if full.lang else None,
        "groups": full.groups,
        "operations": full.operations,
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

    # Stamps read by the introspection walkers (permission_manifest_service,
    # operation_essence_set_link_service) to detect and describe this guard.
    _dependency._is_access_guard = True
    _dependency._access_operation = op_name
    _dependency._access_essences = sorted(required_set)

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
