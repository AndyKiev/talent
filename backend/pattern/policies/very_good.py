from dataclasses import replace
from functools import reduce
from typing import Callable
from domain import Request, User
from pydantic import Field
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

type Policy = Callable[[User, Request], Request]

class PolicySettings(BaseSettings):
    enabled_policies:list[str] = Field(
        default_factory=lambda:[
            "active_user",
            "role_required",
            "mfa_required", 
            "grant_access"
        ]
    )

    model_config = SettingsConfigDict(
        env_file="policies.env",
        env_file_encoding="utf-8",
        env_prefix="APP_",
    )




def active_user(user:User, request:Request) -> Request:
    if not user.is_active:
        raise PermissionError("Inactive users can not make requests")
    return request

def mfa_required(user:User, request:Request) -> Request:
    if request.action =="delete" and not user.has_mfa:
        raise PermissionError("MFA is requred for delete actions")
    return request

def role_required(user:User, request:Request) -> Request:
    if request.required_role and request.required_role not in user.roles:
        raise PermissionError(f"Missing required role:{request.required_role}")
    return request
    

def audit(user:User, request:Request) -> Request:
    if not request.requires_audit:
        return request    
    return replace(
        request,
        audit_log=request.audit_log + [f"{user.name} performed {request.action} on {request.path}"],
    )

        
def grant_access(user:User, request:Request) -> Request:
    return replace(request, access_granted = True)    

POLICY_REGISTRY:dict[str, Policy] = {
    "active_user":active_user,
    "mfa_required":mfa_required,
    "role_required":role_required,
    "grant_access":grant_access,
    "audit":audit
}

def get_policies(settings:PolicySettings) -> list[Policy]:
    try:
        return [POLICY_REGISTRY[name] for name in settings.enabled_policies]
    except KeyError as exc:
        valid = ", ".join(sorted(POLICY_REGISTRY))
        raise ValueError(
            f"Unknown policy name: {exc.args[0]!r}. Valid names: {valid}"
        ) from exc


def apply_policies(user: User, request: Request, policies: list[Policy]) -> Request:
    return reduce(lambda current, policy: policy(user, current), policies, request)


def main() -> None:
    user = User(
        name="Andy",
        is_active=True,
        roles=("admin"),  # Note: should be a set, not a list
        has_mfa=True,    
        subscription_tier="pro"
    )

    request = Request(
        path="/admin/users",
        action="delete",
        requires_audit=True,
        required_role="admin",  # Note: should be string, not list
    )
    
    # print("cwd:", Path.cwd())
    # print("env exists:", Path("policies.env").exists())
    settings = PolicySettings()
    # print("loaded policies:", settings.enabled_policies)

    policies=get_policies(settings)
    request = apply_policies(user, request, policies)
    print(request)

if __name__== "__main__":
    main()