# backend/auth/access_testing.py
#
# "Test as group" override for manual access-control testing.
#
# A developer (real bypass user) can persist an AccessTestContext row selecting
# one or more authorisation groups. While that row exists, this hook rewrites
# the per-request EmployeeSchema so the developer effectively belongs ONLY to
# those groups: bypass is forced off and permission_sets / groups / group_ids
# are recomputed from the selected groups' grants. Every guard and
# GET /menus/my then follows automatically — no per-endpoint change.
#
# Lives in its own module (imports only ORM models, never services) so
# jwt_auth.py stays free of circular-import risk — same reasoning as guards.py.
#
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.access_test_context.access_test_context_model import (
    AccessTestContext,
)
from backend.api_v1.user_group.user_group_model import UserGroup
from backend.api_v1.employee.employee_schema import EmployeeSchema


async def apply_access_test_context(
    session: AsyncSession, schema: EmployeeSchema
) -> EmployeeSchema:
    """If the user has an active test-as row, override the schema to act as ONLY
    the selected groups (bypass off). Always records real_is_bypass /
    can_access_test first so the entry gate and FE indicator work even mid-test.
    """
    schema.real_is_bypass = schema.is_bypass
    schema.can_access_test = schema.is_bypass

    ctx = await session.scalar(
        select(AccessTestContext).where(AccessTestContext.employee_id == schema.id)
    )
    if not ctx or not ctx.group_ids:
        return schema

    groups = (
        await session.scalars(select(UserGroup).where(UserGroup.id.in_(ctx.group_ids)))
    ).all()

    schema.access_testing = True
    schema.is_bypass = False
    schema.group_ids = [g.id for g in groups]
    schema.groups = [g.name for g in groups]
    schema.permission_sets = (
        frozenset().union(*(g.permission_sets for g in groups))
        if groups
        else frozenset()
    )
    schema.permissions = (
        frozenset().union(*(g.permissions for g in groups)) if groups else frozenset()
    )
    return schema
