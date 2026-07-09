from typing import Optional, List, Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.user_setting.user_setting_repository import UserSettingRepository
from backend.api_v1.user_setting.user_setting_model import UserSetting
from backend.api_v1.user_setting.user_setting_schema import (
    UserSetting as UserSettingSchema,
    EffectiveUserSetting,
)
from backend.api_v1.user_setting.user_setting_messages import (
    UserSettingNotFound,
    UserSettingNotOverridable,
    UserSettingValueBelowMin,
)
from backend.api_v1.user_setting.user_setting_messages import (
    UserSettingUpdateSuccess,
    UserSettingDeleteSuccess,
)
from backend.api_v1.app_setting.app_setting_model import AppSetting
from backend.api_v1.app_setting.app_setting_repository import AppSettingRepository
from backend.api_v1.app_setting.app_setting_service import AppSettingService, cast_value


class UserSettingService(BaseService):
    def __init__(
        self,
        repository: UserSettingRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @property
    def _employee_id(self) -> Optional[int]:
        return self.user.id if self.user else None

    async def _setting_by_key(self, key: str) -> Optional[AppSetting]:
        return await self.session.scalar(select(AppSetting).where(AppSetting.key == key))

    async def _override_for(self, app_setting_id: int) -> Optional[UserSetting]:
        return await self.session.scalar(
            select(UserSetting).where(
                UserSetting.employee_id == self._employee_id,
                UserSetting.app_setting_id == app_setting_id,
            )
        )

    @staticmethod
    def _effective_value(setting: AppSetting, override_value: Any) -> Any:
        """The value the user actually gets: their override clamped to [1, global]
        for integers, else the global default.

        Options-driven settings (options_source set, e.g. default_menu) store an
        id picked from a list — the [1, global] quantity clamp does NOT apply."""
        if override_value is None:
            return cast_value(setting.value, setting.value_type_key)
        if setting.value_type_key == "integer" and not setting.options_source:
            try:
                return max(1, min(int(override_value), int(setting.value)))
            except (TypeError, ValueError):
                return cast_value(setting.value, setting.value_type_key)
        return cast_value(override_value, setting.value_type_key)

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    def _setting_visible(self, setting: AppSetting) -> bool:
        """Check whether the current user may see this setting."""
        user_group_ids = set(self.user.group_ids if self.user else [])
        if not user_group_ids:
            return bool(setting.visible_to_regular)
        if setting.visible_to_all_groups:
            return True
        return bool(user_group_ids & set(setting.allowed_group_ids))

    async def get_effective_settings(self) -> List[EffectiveUserSetting]:
        """All overridable, active settings with this user's override merged in.
        Drives the user-facing /settings page. Respects per-setting visibility
        (visible_to_all_groups / visible_to_regular / specific group links)."""
        settings = (
            await self.session.scalars(
                select(AppSetting).where(
                    AppSetting.user_overridable.is_(True),
                    AppSetting.is_active.is_(True),
                )
            )
        ).all()

        overrides: dict[int, UserSetting] = {}
        if self._employee_id is not None:
            rows = (
                await self.session.scalars(
                    select(UserSetting).where(
                        UserSetting.employee_id == self._employee_id
                    )
                )
            ).all()
            overrides = {r.app_setting_id: r for r in rows}

        result: List[EffectiveUserSetting] = []
        for s in settings:
            if not self._setting_visible(s):
                continue
            override = overrides.get(s.id)
            user_value = override.value if override else None
            # Options-driven integers hold an id, not a quantity — no range.
            is_int = s.value_type_key == "integer" and not s.options_source
            result.append(
                EffectiveUserSetting(
                    key=s.key,
                    label_key=s.label_key,
                    description_key=s.description_key,
                    value_type_key=s.value_type_key,
                    options_source=s.options_source,
                    global_value=cast_value(s.value, s.value_type_key),
                    user_value=user_value,
                    effective_value=self._effective_value(s, user_value),
                    has_override=override is not None,
                    min_value=1 if is_int else None,
                    max_value=(
                        int(s.value) if is_int and s.value is not None else None
                    ),
                )
            )
        return result

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------

    async def set_override(
        self, key: str, value: Any
    ) -> MutationResponse[UserSettingSchema]:
        setting = await self._setting_by_key(key)
        if not setting:
            raise await self._resolve_domain_error(UserSettingNotFound(key))
        if not self._setting_visible(setting):
            raise await self._resolve_domain_error(UserSettingNotFound(key))
        if not setting.user_overridable:
            raise await self._resolve_domain_error(UserSettingNotOverridable(key))

        # Type validation reuses the app-setting validator (single source of truth
        # for "does this value match its declared type").
        app_service = AppSettingService(
            repository=AppSettingRepository(session=self.session),
            user=self.user,
            session=self.session,
        )
        await app_service._validate_value(value, setting.value_type_id)

        # Integer floor: a user value must be >= 1 (0/negative rejected). Above
        # the global cap it is silently clamped down to the cap. Options-driven
        # settings (options_source set, e.g. default_menu) store a picked id —
        # the quantity clamp does NOT apply.
        if (
            setting.value_type_key == "integer"
            and value is not None
            and not setting.options_source
        ):
            if int(value) < 1:
                raise await self._resolve_domain_error(UserSettingValueBelowMin(1))
            value = min(int(value), int(setting.value))

        override = await self._override_for(setting.id)
        if override:
            override.value = value
        else:
            override = UserSetting(
                employee_id=self._employee_id,
                app_setting_id=setting.id,
                value=value,
            )
            self.session.add(override)
        await self.session.commit()
        await self.session.refresh(override)

        schema = UserSettingSchema.model_validate(override)
        detail = await self._resolve_domain_success(UserSettingUpdateSuccess(key))
        return MutationResponse(detail=detail, data=schema)

    async def delete_override(self, key: str) -> None:
        setting = await self._setting_by_key(key)
        if not setting:
            raise await self._resolve_domain_error(UserSettingNotFound(key))
        if not self._setting_visible(setting):
            raise await self._resolve_domain_error(UserSettingNotFound(key))
        override = await self._override_for(setting.id)
        if not override:
            raise await self._resolve_domain_error(UserSettingNotFound(key))
        await self.session.delete(override)
        await self.session.commit()
        success = UserSettingDeleteSuccess(key)
        await self._raise_success(
            message_key=success.message_key,
            variables=success.template_vars,
            fallback=success.fallback,
        )
