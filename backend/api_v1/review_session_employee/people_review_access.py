# backend/api_v1/review_session_employee/people_review_access.py
#
# Route guard for people-review SUB-RESOURCE reads (an employee's trainings,
# eligible training types, ... embedded in the evaluation page).
#
# Semantics: allow the request when EITHER
#   (a) the caller holds the admin set-grain permission (same check as Guard),
#   OR
#   (b) the path `employee_id` is within the caller's people-review visibility
#       (self + active-mode oversight/supervision scope).
#
# This is row-scoped: a self-reviewer (or a supervisor within scope) may read
# their own embedded data without the blanket admin "view" grant, which would
# otherwise let them read EVERY employee's data. Mirrors the visibility a user
# already has over the review record itself.
#
# Read-only: keep POST/PATCH/DELETE on the admin Guard — a self-reviewer must
# not self-assign trainings etc.
#
# Lives in the review_session_employee package (not auth/guards.py) and
# lazy-imports the RSE service inside the dependency, so the auth ↔ routers
# import graph stays acyclic.
from typing import Callable

from fastapi import Depends, HTTPException, status, params
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.database.db_helper import db_helper
from backend.auth.jwt_auth import (
    get_current_active_auth_user,
    _translate_permission_denied,
)
from backend.auth.permission_errors import PermissionDeniedSet
from backend.utils.enums import OperationVerb, EssenceName


def PeopleReviewScopedGuard(
    operation: "str | OperationVerb",
    *essences: "str | EssenceName",
) -> params.Depends:
    """Guard for people-review sub-resource reads keyed on a path `employee_id`.

    Passes if the caller has the admin permission set OR the employee is within
    their people-review visibility. Use in `dependencies=[...]` exactly like
    `Guard(...)`; the route MUST have an `{employee_id}` path parameter.
    """
    op_name = operation.value if isinstance(operation, OperationVerb) else operation
    required_set = frozenset(
        e.value if isinstance(e, EssenceName) else e for e in essences
    )
    if not required_set:
        raise ValueError("PeopleReviewScopedGuard requires at least one essence.")

    async def _dependency(
        employee_id: int,
        current_user: EmployeeSchema = Depends(get_current_active_auth_user),
        session: AsyncSession = Depends(db_helper.session_getter),
    ) -> EmployeeSchema:
        # 1) Admin path — in-memory checks, no query.
        if getattr(current_user, "is_bypass", False):
            return current_user
        if (op_name, required_set) in current_user.permission_sets:
            return current_user

        # 2) People-review scope path — self + active-mode scope.
        from backend.api_v1.review_session_employee.review_session_employee_service import (
            ReviewSessionEmployeeService,
        )
        from backend.api_v1.review_session_employee.review_session_employee_repository import (
            ReviewSessionEmployeeRepository,
        )

        service = ReviewSessionEmployeeService(
            repository=ReviewSessionEmployeeRepository(session=session),
            user=current_user,
            session=session,
        )
        if await service.is_employee_visible(employee_id):
            return current_user

        # 3) Neither — same translated 403 the admin Guard raises.
        exc = PermissionDeniedSet(op_name, sorted(required_set))
        translated = await _translate_permission_denied(
            exc, current_user.lang_id, session
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=translated,
        )

    return Depends(_dependency)
