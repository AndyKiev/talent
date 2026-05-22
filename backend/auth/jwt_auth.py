from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from backend.auth.auth_dependencies import validate_auth_user_ldap
from backend.auth import auth_utils as auth_utils
from backend.auth.auth_schemas import LDAPUser, AuthResponse
from backend.api_v1.employee.employee_service import EmployeeService
from backend.api_v1.employee.employee_repository import EmployeeRepository
from backend.database.db_helper import db_helper
from backend.api_v1.employee.employee_schema import EmployeeCreate, EmployeeSchema
from backend.utils.enums import OperationTypes

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
    return await service._to_schema(orm_user)


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
