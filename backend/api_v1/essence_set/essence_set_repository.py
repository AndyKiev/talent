# backend/api_v1/essence_set/essence_set_repository.py
from typing import Optional

from sqlalchemy import select
from sqlalchemy.engine import Result

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.essence_set.essence_set_model import EssenceSet


class EssenceSetRepository(BaseRepository):
    model = EssenceSet

    async def get_by_fingerprint(self, fingerprint: str) -> Optional[EssenceSet]:
        """Look a set up by its canonical fingerprint (the identity column)."""
        stmt = select(EssenceSet).where(EssenceSet.fingerprint == fingerprint)
        result: Result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
