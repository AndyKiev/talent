from typing import Annotated, List, Optional
from pydantic import BaseModel


class LDAPUser(BaseModel):
    """Schema for LDAP employee data"""

    user_ukr: str
    full_name: str
    group: List[str]
    exp: Annotated[int, None] = None
    iat: Annotated[int, None] = None


class TokenUser(BaseModel):
    """Schema for JWT token payload - maps to your database fields"""

    sub: str  # This will be the employee's code from your database
    username: str  # This will be the employee's name from your database
    user_ukr: Optional[str] = None
    groups: Optional[List[str]] = None
    operations: Optional[List[str]] = None


class AuthResponse(BaseModel):
    """Schema for authentication response (login) — both tokens."""

    access_token: str
    refresh_token: str
    token_type: str = "Bearer"


class RefreshRequest(BaseModel):
    """Body of POST /jwt/refresh — the long-lived refresh token."""

    refresh_token: str
