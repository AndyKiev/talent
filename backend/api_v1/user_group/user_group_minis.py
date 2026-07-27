"""Cheap user-group display-info lookup (names by type) via a COLUMN select.

Selecting columns (not the UserGroup entity) never instantiates ORM objects, so
none of UserGroup's heavy selectin relationships (employees, jobs, both grant
grains, …) fire. UserGroupTypeService uses this to fill the `groups` field on
UserGroupTypeSchema, whose model relationship is deliberately lazy="noload".
"""

from collections.abc import Iterable

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.user_group.user_group_model import UserGroup


async def fetch_group_names_by_type(
    session: AsyncSession, type_ids: Iterable[int | None]
) -> dict[int, list[str]]:
    """Map user_group_type_id -> sorted names of the groups of that type.

    Types with no groups map to an empty list, so callers can index directly.
    """
    wanted = {i for i in type_ids if i is not None}
    if not wanted:
        return {}
    rows = (
        await session.execute(
            select(UserGroup.user_group_type_id, UserGroup.name)
            .where(UserGroup.user_group_type_id.in_(wanted))
            .order_by(UserGroup.name)
        )
    ).all()
    result: dict[int, list[str]] = {type_id: [] for type_id in wanted}
    for type_id, name in rows:
        if name:
            result[type_id].append(name)
    return result
