# backend/auth/guards.py
#
# One-line route guards.
#
# `has_access_set(verb, *essences)` is the real check; it lives in jwt_auth.py
# and returns a FastAPI dependency. The 8-line parameter form
#
#     _auth_user: Annotated[
#         UserSchema,
#         Depends(has_access_set(OperationVerb.LINK,
#                                EssenceName.TALENT_STATUS,
#                                EssenceName.TALENT_PERIOD)),
#     ] = None,
#
# is noisy and repeats on nearly every endpoint. `Guard(...)` wraps it so the
# check moves into the route decorator's `dependencies=[]` list and the handler
# signature stays clean:
#
#     @router.post(
#         "",
#         response_model=MutationResponse[TalentStatusPeriodLinkSchema],
#         status_code=status.HTTP_201_CREATED,
#         dependencies=[Guard(OperationVerb.LINK,
#                             EssenceName.TALENT_STATUS,
#                             EssenceName.TALENT_PERIOD)],
#     )
#     async def create_talent_status_period_link(...): ...
#
# The guard still enforces auth + active-user + 403-with-translation exactly as
# before. Only the return value (current_user) is dropped, which is fine when
# the handler never reads it. If a handler DOES need the user, keep the explicit
#
#     user: EmployeeSchema = Depends(has_access_set(...))
#
# form instead.
#
# Lives in its own module (not jwt_auth.py) so the heavy auth module stays
# untouched and there is no circular-import risk — same reasoning as
# permission_resolvers.py.
#
from typing import TYPE_CHECKING

from fastapi import Depends, params

from backend.auth.jwt_auth import has_access_set

if TYPE_CHECKING:
    from backend.utils.enums import EssenceName, OperationVerb


def Guard(
    operation: "str | OperationVerb",
    *essences: "str | EssenceName",
) -> params.Depends:
    """
    Set-grain route guard for use in `dependencies=[...]`.

    Thin alias over `Depends(has_access_set(operation, *essences))`.
    AND-semantics are preserved: a grant for {A, B} does NOT satisfy a guard
    for {A} alone; a single essence is just a set of size one.
    """
    return Depends(has_access_set(operation, *essences))
