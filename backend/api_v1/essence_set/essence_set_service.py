# backend/api_v1/essence_set/essence_set_service.py
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.essence_set.essence_set_repository import EssenceSetRepository
from backend.api_v1.essence_set.essence_set_model import EssenceSet
from backend.api_v1.essence_set.essence_set_member_model import EssenceSetMember
from backend.api_v1.essence_set.essence_set_messages import (
    EssenceSetNotFound,
    EssenceSetInvalidMembers,
)
from backend.api_v1.essence.essence_model import Essence
from backend.utils.essence_set_fingerprint import fingerprint


class EssenceSetService(BaseService):
    def __init__(
        self,
        repository: EssenceSetRepository,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, session=session)

    # ── Read ──────────────────────────────────────────────────────────────────

    async def get_by_id(self, essence_set_id: int) -> EssenceSet:
        record = await self.repository.get_by_id(essence_set_id)
        if not record:
            raise await self._resolve_domain_error(EssenceSetNotFound(essence_set_id))
        return record

    # ── Write ─────────────────────────────────────────────────────────────────

    async def _validate_members_exist(self, essence_ids: set[int]) -> None:
        """Ensure every essence id maps to a real essence before building a set."""
        stmt = select(Essence.id).where(Essence.id.in_(essence_ids))
        result = await self.session.execute(stmt)
        found = {row[0] for row in result.all()}
        missing = essence_ids - found
        if missing:
            raise await self._resolve_domain_error(EssenceSetInvalidMembers(missing))

    async def get_or_create(self, essence_ids: list[int]) -> EssenceSet:
        """
        Resolve an EssenceSet for the given essence ids, creating it if needed.

        Single entry point for turning "a bunch of essences" into a canonical,
        deduplicated set row. Both the admin UI and the backfill migration go
        through here, so set identity is always consistent.

        A single essence id is just a set of size one — no special-casing.
        """
        # fingerprint() sorts, dedups, and validates positivity/non-emptiness.
        fp = fingerprint(essence_ids)

        existing = await self.repository.get_by_fingerprint(fp)
        if existing:
            return existing

        unique_ids = {int(e) for e in essence_ids}
        await self._validate_members_exist(unique_ids)

        # Create the set + its members in one transaction.
        essence_set = EssenceSet(fingerprint=fp)
        for eid in sorted(unique_ids):
            essence_set.members.append(EssenceSetMember(essence_id=eid))

        self.session.add(essence_set)
        await self.session.commit()
        await self.session.refresh(essence_set)
        return essence_set
