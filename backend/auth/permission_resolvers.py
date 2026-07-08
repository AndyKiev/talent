# backend/auth/permission_resolvers.py
"""
Pure resolver functions that build permission frozensets from a loaded
Employee ORM instance.

Kept in a dedicated module so that both:
  - backend.auth.jwt_auth          (FastAPI auth layer)
  - backend.api_v1.employee.employee_service  (service layer)
can import from here without creating a circular dependency.

No FastAPI, no SQLAlchemy sessions, no service imports — just ORM attribute
traversal over selectin-loaded relationships.
"""


# Role identity is carried by boolean FLAGS on the rows, never by name or id:
#   - UserGroupType.is_authorisation  — the type whose groups grant permissions
#   - UserGroup.is_regular_baseline   — the implicit "regular user" baseline
#   - UserGroup.is_bypass             — superadmin groups skipping every check
# Names/ids are unstable (renames, per-environment reseed) so they are not used.


def _is_authorisation(ug) -> bool:
    """True if the group's type is flagged as the access-control type."""
    return bool(ug and ug.user_group_type and ug.user_group_type.is_authorisation)


def has_authorisation_group(user_orm) -> bool:
    """True if the employee belongs to at least one authorisation-type group."""
    for eugl in user_orm.user_groups:
        if _is_authorisation(eugl.user_group):
            return True
    return False


def resolve_user_permissions(
    user_orm, fallback_group=None
) -> frozenset[tuple[str, str]]:
    """
    Build the full (verb, essence) permission set for an Employee ORM instance.

    Relation path:
        employee.user_groups                    → [EmployeeUserGroupLink]
          .user_group                           → UserGroup
            .user_group_type.name == 'authorisation'   (filter)
            .permissions                        → frozenset[tuple[str, str]]

    ``fallback_group``: the seeded 'regular' UserGroup — used ONLY when the
    employee has no authorisation group at all (the "regular user" baseline).
    """
    if fallback_group is not None and not has_authorisation_group(user_orm):
        return frozenset(fallback_group.permissions)

    perms: set[tuple[str, str]] = set()

    for eugl in user_orm.user_groups:
        ug = eugl.user_group
        if not _is_authorisation(ug):
            continue
        perms |= ug.permissions  # UserGroup.permissions property

    return frozenset(perms)


def resolve_user_permission_sets(
    user_orm, fallback_group=None
) -> frozenset[tuple[str, frozenset[str]]]:
    """
    Build the full (verb, {essence, ...}) permission-set for an Employee ORM instance.

    Set-grain sibling of resolve_user_permissions(). Each element's second
    member is a frozenset of essence names, so the whole structure is hashable
    and order-independent: {'a','b'} == {'b','a'}.

    Relation path:
        employee.user_groups                        → [EmployeeUserGroupLink]
          .user_group                               → UserGroup
            .user_group_type.name == 'authorisation'        (filter)
            .permission_sets                        → frozenset[tuple[str, frozenset[str]]]

    ``fallback_group``: the seeded 'regular' UserGroup — used ONLY when the
    employee has no authorisation group at all (the "regular user" baseline).
    """
    if fallback_group is not None and not has_authorisation_group(user_orm):
        return frozenset(fallback_group.permission_sets)

    perms: set[tuple[str, frozenset[str]]] = set()

    for eugl in user_orm.user_groups:
        ug = eugl.user_group
        if not _is_authorisation(ug):
            continue
        perms |= ug.permission_sets  # UserGroup.permission_sets property

    return frozenset(perms)


def resolve_user_is_bypass(user_orm) -> bool:
    """
    True if the user belongs to a bypass group (UserGroup.is_bypass) of the
    authorisation type. Bypass users skip every set-grain permission check.

    Same authorisation-type filter as the permission resolvers above, so a
    flagged group of any other type does NOT grant a bypass.
    """
    for eugl in user_orm.user_groups:
        ug = eugl.user_group
        if not _is_authorisation(ug):
            continue
        if ug.is_bypass:
            return True
    return False
