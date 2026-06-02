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


def resolve_user_permissions(user_orm) -> frozenset[tuple[str, str]]:
    """
    Build the full (verb, essence) permission set for an Employee ORM instance.

    Relation path:
        employee.user_groups                    → [EmployeeUserGroupLink]
          .user_group                           → UserGroup
            .user_group_type.name == 'authorisation'   (filter)
            .permissions                        → frozenset[tuple[str, str]]
    """
    perms: set[tuple[str, str]] = set()

    for eugl in user_orm.user_groups:
        ug = eugl.user_group
        if not ug:
            continue
        if not ug.user_group_type or ug.user_group_type.name != "authorisation":
            continue
        perms |= ug.permissions  # UserGroup.permissions property

    return frozenset(perms)


def resolve_user_permission_sets(user_orm) -> frozenset[tuple[str, frozenset[str]]]:
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
    """
    perms: set[tuple[str, frozenset[str]]] = set()

    for eugl in user_orm.user_groups:
        ug = eugl.user_group
        if not ug:
            continue
        if not ug.user_group_type or ug.user_group_type.name != "authorisation":
            continue
        perms |= ug.permission_sets  # UserGroup.permission_sets property

    return frozenset(perms)