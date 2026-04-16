from typing import List

from sqlalchemy import select

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.user.user_model import User
from backend.api_v1.user.user_errors import (
    UserNotFound,
)


class UserRepository(BaseRepository):
    model = User

    # -----------------------------------------------------------------------
    # Custom queries
    # -----------------------------------------------------------------------

    async def get_by_code(self, code: str) -> User | None:
        """Case-normalised lookup by user code."""
        return await self.get_by_field("code", code.strip().upper())