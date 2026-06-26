# backend/api_v1/hrm_scope/hrm_scope_constants.py
"""
Single source of truth for the user_group names that drive HRM scope filtering.

EDIT THESE to match the exact names of your seeded user_groups. They are the
only place group names are hardcoded; both the HRM-scope service and the
employee-list filter import from here.

Matching is case-insensitive (see helpers below), so 'Admin' == 'admin'.
"""

# The authorisation group that marks an employee as an HRM and therefore
# subjects them to the scope-based employee-visibility limit.
HRM_GROUP_NAME = "HRM"

# Groups whose members bypass the limit entirely and see ALL employees.
# Add/rename as needed (e.g. "administrator", "hr_supervisor").
BYPASS_GROUP_NAMES = frozenset({"admin", "HRS", "dev"})


def _norm(name: str) -> str:
    return (name or "").strip().lower()


def has_bypass(group_names: list[str]) -> bool:
    """True if any of the user's groups is a see-all (bypass) group."""
    wanted = {_norm(n) for n in BYPASS_GROUP_NAMES}
    return any(_norm(g) in wanted for g in group_names)


def is_hrm(group_names: list[str]) -> bool:
    """True if the user holds the HRM group."""
    return any(_norm(g) == _norm(HRM_GROUP_NAME) for g in group_names)


# ── Department category keys used to order the employees-page filter Select ──
# These must match department_categories.key seed values.
STORE_CATEGORY_KEY = "store"
DIRECTORATE_CATEGORY_KEY = "directorate"
