from collections.abc import Callable
from dataclasses import replace
from functools import reduce

from domain import Request, User

type PolicyFn = Callable[[User, Request], Request]


def active_user(user: User, request: Request) -> Request:
    if not user.is_active:
        raise PermissionError("Inactive users can not make requests")
    return request


def mfa_required(user: User, request: Request) -> Request:
    if request.action == "delete" and not user.has_mfa:
        raise PermissionError("MFA is requred for delete actions")
    return request


def role_required(user: User, request: Request) -> Request:
    if request.required_role and request.required_role not in user.roles:
        raise PermissionError(f"Missing required role:{request.required_role}")
    return request


def audit(user: User, request: Request) -> Request:

    if not request.requires_audit:
        return request
        # audit_log=request.audit_log + [f"{user.name} performed {request.action} on {request.path}"]
    return replace(
        request,
        audit_log=request.audit_log
        + [f"{user.name} performed {request.action} on {request.path}"],
    )


def grant_access(user: User, request: Request) -> Request:
    return replace(request, access_granted=True)


def apply_policies(user: User, request: Request, policies: list[PolicyFn]) -> Request:
    return reduce(lambda current, policy: policy(user, current), policies, request)


def main() -> None:
    user = User(
        name="Andy",
        is_active=True,
        roles=("admin"),  # Note: should be a set, not a list
        has_mfa=True,
        subscription_tier="pro",
    )

    request = Request(
        path="/admin/users",
        action="delete",
        requires_audit=True,
        required_role="admin",  # Note: should be string, not list
    )

    policies = [active_user, mfa_required, role_required, audit, grant_access]
    request = apply_policies(user, request, policies)
    print(request)


if __name__ == "__main__":
    main()
