from sqlalchemy import delete

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.app_setting.app_setting_model import AppSetting
from backend.api_v1.table_relationship_links.app_setting_user_group_link_model import (
    AppSettingUserGroupLink,
)


class AppSettingRepository(BaseRepository):
    model = AppSetting

    async def set_group_links(
        self, app_setting_id: int, group_ids: list[int]
    ) -> None:
        """Replace a setting's group links with exactly `group_ids` (by id)."""
        await self.session.execute(
            delete(AppSettingUserGroupLink).where(
                AppSettingUserGroupLink.app_setting_id == app_setting_id
            )
        )
        if group_ids:
            self.session.add_all(
                [
                    AppSettingUserGroupLink(
                        app_setting_id=app_setting_id, user_group_id=gid
                    )
                    for gid in dict.fromkeys(group_ids)  # dedupe, keep order
                ]
            )
        await self.session.commit()
