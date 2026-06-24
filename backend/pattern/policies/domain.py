from dataclasses import dataclass, field


@dataclass
class User:
    name: str
    is_active: bool
    roles: set[str]
    has_mfa: bool
    subscription_tier: str


@dataclass
class Request:
    path: str
    action: str
    requires_audit: bool = False
    required_role: str | None = None
    access_granted: bool = False
    audit_log: list[str] = field(default_factory=list)
