
from pydantic import BaseModel


class OversightManagerOption(BaseModel):
    """A candidate oversight reviewer the employee may pick — an EXISTING holder of
    the people_review oversight role (link_target='employee'). The employee can only
    choose from people the admin already designated as oversight reviewers."""

    process_role_holder_id: int
    holder_employee_id: int
    holder_code: str | None = None
    holder_name: str | None = None
    # Disambiguates when more than one oversight role exists (realistically one).
    role_name: str | None = None


class MyOversightManager(BaseModel):
    """The current user's chosen oversight manager (their single oversight link)."""

    link_id: int
    process_role_holder_id: int
    holder_employee_id: int
    holder_code: str | None = None
    holder_name: str | None = None


class SetOversightManager(BaseModel):
    # The holder (oversight reviewer) the user picks; employee_id is the current
    # user, set server-side from the token — never sent by the client.
    process_role_holder_id: int
