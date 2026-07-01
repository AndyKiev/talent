from datetime import date
from typing import Optional, List, Any

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.app_setting.app_setting_repository import AppSettingRepository
from backend.api_v1.app_setting.app_setting_schema import (
    AppSetting as AppSettingSchema,
    AppSettingCreate,
    AppSettingUpdate,
)
from backend.api_v1.app_setting.app_setting_errors import (
    AppSettingNotFound,
    AppSettingNotFoundByKey,
    AppSettingKeyTaken,
    AppSettingValueTypeMismatch,
    AppSettingValueBelowMin,
    AppSettingDeleteError,
)
from backend.api_v1.app_setting.app_setting_success import (
    AppSettingDeleteSuccess,
    AppSettingCreateSuccess,
    AppSettingUpdateSuccess,
)
from backend.api_v1.setting_value_type.setting_value_type_model import SettingValueType


def cast_value(value: Any, type_key: Optional[str]) -> Any:
    """
    Read a setting's stored JSON value as its declared type. The JSON value is
    usually already the right Python type; this normalises loosely-stored
    values (e.g. "true"/1 stored for a boolean) so consumers get a clean type.
    This is the single place that knows how to read each value type.
    """
    if value is None or type_key is None:
        return value
    if type_key == "boolean":
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            return value.strip().lower() in ("true", "1", "yes")
        return bool(value)
    if type_key == "integer":
        return int(value)
    if type_key == "date":
        # Stored as an ISO string; returned as-is (the frontend formats it).
        return value
    # "json" (or any other) — the parsed object as stored.
    return value


async def get_bool_setting(
    session: AsyncSession, key: str, default: bool = False
) -> bool:
    """Read a boolean app setting by key from inside business logic (server-side).

    Returns ``default`` when the row is missing (so a not-yet-seeded flag behaves
    predictably) or when its value can't be read as a bool. Reuses ``cast_value``
    so loosely-stored values ("true"/1) still normalise. This is the single place
    services should call to gate behaviour on a feature flag.
    """
    from backend.api_v1.app_setting.app_setting_model import AppSetting as AppSettingModel

    row = await session.scalar(
        select(AppSettingModel).where(AppSettingModel.key == key)
    )
    if row is None:
        return default
    type_key = await session.scalar(
        select(SettingValueType.key).where(SettingValueType.id == row.value_type_id)
    )
    value = cast_value(row.value, type_key)
    return value if isinstance(value, bool) else default


async def get_list_setting(
    session: AsyncSession, key: str, default: Optional[List] = None
) -> List:
    """Read a JSON-list app setting by key from server-side business logic.

    Returns ``default`` (or ``[]``) when the row is missing or its value is not a
    list. Used for multi-valued settings (e.g. the review-session job-category /
    status filters). This is the list counterpart of ``get_bool_setting``.
    """
    from backend.api_v1.app_setting.app_setting_model import AppSetting as AppSettingModel

    fallback = default if default is not None else []
    row = await session.scalar(
        select(AppSettingModel).where(AppSettingModel.key == key)
    )
    if row is None or not isinstance(row.value, list):
        return fallback
    return row.value


async def get_effective_bool_setting(
    session: AsyncSession, key: str, default: bool = False
) -> bool:
    """Effective boolean for a (possibly nested) setting: on only when the setting
    AND every ancestor are on. Walks the parent_id chain up the tree. Returns
    ``default`` when the setting row is missing. Use this (not get_bool_setting)
    to gate a CHILD of a multi-story setting, so the parent/master switch is
    honoured automatically.
    """
    from backend.api_v1.app_setting.app_setting_model import AppSetting as AppSettingModel

    row = await session.scalar(
        select(AppSettingModel).where(AppSettingModel.key == key)
    )
    if row is None:
        return default
    seen: set[int] = set()
    cur: Optional[AppSettingModel] = row
    while cur is not None and cur.id not in seen:
        seen.add(cur.id)
        type_key = await session.scalar(
            select(SettingValueType.key).where(SettingValueType.id == cur.value_type_id)
        )
        if cast_value(cur.value, type_key) is not True:
            return False
        if cur.parent_id is None:
            return True
        cur = await session.get(AppSettingModel, cur.parent_id)
    return True


class AppSettingService(BaseService):
    def __init__(
        self,
        repository: AppSettingRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    async def _value_type_key(self, value_type_id: int) -> Optional[str]:
        record = await self.session.get(SettingValueType, value_type_id)
        return record.key if record else None

    async def _validate_value(self, value: Any, value_type_id: int) -> None:
        """Reject a value that doesn't match its declared type."""
        if value is None:
            return
        type_key = await self._value_type_key(value_type_id)
        if type_key is None:
            return
        ok = True
        if type_key == "boolean":
            ok = isinstance(value, bool)
        elif type_key == "integer":
            ok = isinstance(value, int) and not isinstance(value, bool)
        elif type_key == "date":
            ok = isinstance(value, str)
            if ok:
                try:
                    date.fromisoformat(value)
                except ValueError:
                    ok = False
        elif type_key == "json":
            ok = isinstance(value, (dict, list))
        if not ok:
            raise await self._resolve_domain_error(
                AppSettingValueTypeMismatch(type_key)
            )

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    async def get_by_id(self, id: int) -> AppSettingSchema:
        result = await self.repository.get_by_id(id)
        if not result:
            raise await self._resolve_domain_error(AppSettingNotFound(id))
        return result

    async def get_app_settings(
        self, sort: Optional[str] = None
    ) -> List[AppSettingSchema]:
        records = await self.get_all(sort_json=sort)
        return [AppSettingSchema.model_validate(r) for r in records]

    async def get_by_key(self, key: str) -> AppSettingSchema:
        record = await self.repository.get_by_field("key", key)
        if not record:
            raise await self._resolve_domain_error(AppSettingNotFoundByKey(key))
        return AppSettingSchema.model_validate(record)

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------

    async def create_app_setting(
        self, setting_in: AppSettingCreate
    ) -> MutationResponse[AppSettingSchema]:
        existing = await self.repository.get_by_field("key", setting_in.key)
        if existing:
            raise await self._resolve_domain_error(AppSettingKeyTaken(setting_in.key))
        await self._validate_value(setting_in.value, setting_in.value_type_id)
        try:
            data = setting_in.model_dump()
            if self.user:
                data["created_by"] = self.user.id
            record = await self.repository.create_from_dict(data)
            schema = AppSettingSchema.model_validate(record)
            detail = await self._resolve_domain_success(
                AppSettingCreateSuccess(schema.key)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(AppSettingKeyTaken(setting_in.key))

    async def update_app_setting(
        self, setting_id: int, setting_update: AppSettingUpdate
    ) -> MutationResponse[AppSettingSchema]:
        orm_record = await self.get_by_id(setting_id)
        update_data = setting_update.model_dump(exclude_unset=True)
        # A setting locked to app-level (user_override_allowed=False) can never be
        # made user-overridable — force it off regardless of what the client sends.
        allowed = update_data.get(
            "user_override_allowed", orm_record.user_override_allowed
        )
        if not allowed:
            update_data["user_overridable"] = False
        # Validate value against the (possibly new) type.
        if "value" in update_data:
            type_id = update_data.get("value_type_id", orm_record.value_type_id)
            await self._validate_value(update_data["value"], type_id)
            # An overridable integer is a cap: it must stay >= 1 so the user
            # range [1, cap] is never empty (admin can't set 0/negative).
            type_key = await self._value_type_key(type_id)
            will_be_overridable = update_data.get(
                "user_overridable", orm_record.user_overridable
            )
            new_value = update_data["value"]
            if (
                type_key == "integer"
                and will_be_overridable
                and isinstance(new_value, int)
                and new_value < 1
            ):
                raise await self._resolve_domain_error(AppSettingValueBelowMin(1))
        updated = await self.repository.update(
            instance=orm_record, instance_update=update_data
        )
        # Lowering an integer cap clamps every user override above it down to the
        # new cap (e.g. cap 5 -> 4 turns a user's stored 5 into 4).
        if "value" in update_data:
            await self._clamp_user_overrides(updated)
        schema = AppSettingSchema.model_validate(updated)
        detail = await self._resolve_domain_success(AppSettingUpdateSuccess(schema.key))
        return MutationResponse(detail=detail, data=schema)

    async def _clamp_user_overrides(self, setting) -> None:
        """Clamp per-user overrides of an integer cap setting down to the global
        value. No-op for non-integer / non-overridable settings. Touches only the
        user_settings preference rows — never any saved domain data (missions etc.)."""
        type_key = await self._value_type_key(setting.value_type_id)
        if type_key != "integer" or not setting.user_overridable:
            return
        try:
            cap = int(setting.value)
        except (TypeError, ValueError):
            return
        from backend.api_v1.user_setting.user_setting_model import UserSetting

        rows = (
            await self.session.scalars(
                select(UserSetting).where(UserSetting.app_setting_id == setting.id)
            )
        ).all()
        changed = False
        for row in rows:
            try:
                if int(row.value) > cap:
                    row.value = cap
                    changed = True
            except (TypeError, ValueError):
                continue
        if changed:
            await self.session.commit()

    async def get_effective_for_user(self) -> List[AppSettingSchema]:
        """All settings with `value` resolved for the current user: a per-user
        override (clamped to [1, global] for integers) when the setting is
        overridable and the user has one, else the global value. Same shape as
        get_app_settings so existing consumer hooks need no change."""
        records = await self.get_all()
        overrides: dict[int, Any] = {}
        if self.user is not None:
            from backend.api_v1.user_setting.user_setting_model import UserSetting

            rows = (
                await self.session.scalars(
                    select(UserSetting).where(
                        UserSetting.employee_id == self.user.id
                    )
                )
            ).all()
            overrides = {r.app_setting_id: r.value for r in rows}
        result: List[AppSettingSchema] = []
        for r in records:
            schema = AppSettingSchema.model_validate(r)
            if r.user_overridable and overrides.get(r.id) is not None:
                val = overrides[r.id]
                if r.value_type_key == "integer":
                    try:
                        val = max(1, min(int(val), int(r.value)))
                    except (TypeError, ValueError):
                        val = r.value
                schema.value = val
            result.append(schema)
        return result

    async def delete_app_setting(self, setting_id: int) -> None:
        record = await self.get_by_id(setting_id)
        await self.delete_by_id(
            setting_id,
            name=record.key,
            delete_error_exc=AppSettingDeleteError,
            delete_success_exc=AppSettingDeleteSuccess,
        )
