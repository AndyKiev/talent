# backend/utils/name_order.py
"""Request-scoped name order for composed employee display names.

Employees carry NO name column: `Employee.name` is a property that composes the
person's parts. Whether it renders "Last First" or "First Last" is the VIEWER's
preference (`surname_first_in_names`, per-user overridable), and the property is
sync — so the value has to be resolved before serialization and parked
somewhere the property can read without awaiting. That is this ContextVar.

It is set once per request by the auth dependency (`get_current_auth_user`).
Anything with no request behind it — scheduled scripts, seeds, the login route
before the user is known — reads the default (True = "Last First").

A ContextVar (not a global) because asyncio tasks each get their own copy: two
concurrent requests with opposite preferences can never see each other's value.
"""

from contextvars import ContextVar

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

_surname_first: ContextVar[bool] = ContextVar("surname_first", default=True)


def current_surname_first() -> bool:
    """Name order for the current request. True = "Last First" (the default)."""
    return _surname_first.get()


def set_surname_first(value: bool) -> None:
    """Park the resolved preference for this request. Called by the auth
    dependency; no other caller should need it outside tests."""
    _surname_first.set(value)


async def resolve_surname_first(
    session: AsyncSession, employee_id: int | None = None
) -> bool:
    """One query: the global setting value, overridden by this employee's
    user_settings row when the setting is user-overridable and they stored one.

    Deliberately NOT get_user_bool_setting — that costs three round trips and
    this runs on every authenticated request. Same semantics, one LEFT JOIN.
    """
    from backend.api_v1.app_setting.app_setting_model import AppSetting
    from backend.api_v1.app_setting.app_setting_service import (
        SURNAME_FIRST_KEY,
        cast_value,
    )
    from backend.api_v1.user_setting.user_setting_model import UserSetting

    stmt = (
        select(AppSetting.value, AppSetting.user_overridable, UserSetting.value)
        .outerjoin(
            UserSetting,
            (UserSetting.app_setting_id == AppSetting.id)
            & (UserSetting.employee_id == employee_id),
        )
        .where(AppSetting.key == SURNAME_FIRST_KEY)
    )
    row = (await session.execute(stmt)).first()
    if row is None:
        # Not seeded yet — behave like the shipped default.
        return True
    global_value, user_overridable, override = row
    value = override if (user_overridable and override is not None) else global_value
    value = cast_value(value, "boolean")
    return value if isinstance(value, bool) else True
