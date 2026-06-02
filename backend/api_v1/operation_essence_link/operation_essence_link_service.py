# backend/api_v1/operation_essence_link/operation_essence_link_service.py
#
# Manages the cartesian product of (operation, essence) permission pairs
# and their assignment to user groups.
#
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.operation_essence_link.operation_essence_link_model import (
    OperationEssenceLink,
)
from backend.api_v1.table_relationship_links.user_group_operation_essence_link_model import (
    UserGroupOperationEssenceLink,
)
from backend.api_v1.operation.operation_model import Operation
from backend.api_v1.essence.essence_model import Essence
from pydantic import BaseModel
from typing import List


# ── Pydantic schemas (inline — simple enough to not need a separate file) ──────

class PermissionPairSchema(BaseModel):
    id: int
    operation_id: int
    operation_name: str
    essence_id: int
    essence_name: str
    user_group_names: List[str] = []

    model_config = {"from_attributes": True}


class GrantPermissionRequest(BaseModel):
    operation_id: int
    essence_id: int


class SetGroupPermissionsRequest(BaseModel):
    """Replace all OEL grants for a user group with this new list."""
    operation_essence_link_ids: List[int]


# ── Service ───────────────────────────────────────────────────────────────────

class OperationEssenceLinkService:

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    # ── Read ──────────────────────────────────────────────────────────────────

    async def get_all(
        self,
        operation_name: str | None = None,
        essence_name: str | None = None,
    ) -> list[OperationEssenceLink]:
        stmt = select(OperationEssenceLink)
        result = await self.session.execute(stmt)
        links = list(result.scalars().all())

        if operation_name:
            links = [l for l in links if l.operation_name == operation_name]
        if essence_name:
            links = [l for l in links if l.essence_name == essence_name]
        return links

    async def get_by_id(self, oel_id: int) -> OperationEssenceLink | None:
        return await self.session.get(OperationEssenceLink, oel_id)

    async def get_by_pair(
        self, operation_id: int, essence_id: int
    ) -> OperationEssenceLink | None:
        stmt = select(OperationEssenceLink).where(
            OperationEssenceLink.operation_id == operation_id,
            OperationEssenceLink.essence_id == essence_id,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_for_user_group(self, user_group_id: int) -> list[OperationEssenceLink]:
        """All permission pairs currently granted to a user group."""
        stmt = (
            select(OperationEssenceLink)
            .join(
                UserGroupOperationEssenceLink,
                UserGroupOperationEssenceLink.operation_essence_link_id
                == OperationEssenceLink.id,
            )
            .where(UserGroupOperationEssenceLink.user_group_id == user_group_id)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    # ── Write: manage OEL rows ────────────────────────────────────────────────

    async def get_or_create_pair(
        self, operation_id: int, essence_id: int
    ) -> OperationEssenceLink:
        """
        Idempotent: returns the existing OEL row or creates it.
        Use this when you want to ensure a (verb, resource) pair exists.
        """
        existing = await self.get_by_pair(operation_id, essence_id)
        if existing:
            return existing

        # Validate FK targets exist
        op = await self.session.get(Operation, operation_id)
        es = await self.session.get(Essence, essence_id)
        if not op:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail=f"Operation {operation_id} not found.")
        if not es:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail=f"Essence {essence_id} not found.")

        link = OperationEssenceLink(operation_id=operation_id, essence_id=essence_id)
        self.session.add(link)
        await self.session.flush()
        await self.session.refresh(link)
        return link

    async def delete_pair(self, oel_id: int) -> None:
        """
        Delete an OEL row. Will cascade-delete all UGOEL rows referencing it,
        effectively revoking this permission from all groups that held it.
        """
        link = await self.get_by_id(oel_id)
        if link:
            await self.session.delete(link)
            await self.session.flush()

    # ── Write: grant/revoke OEL rows to/from a user group ────────────────────

    async def grant_to_group(
        self, user_group_id: int, operation_essence_link_id: int
    ) -> None:
        """Grant a single (verb, essence) permission to a user group (idempotent)."""
        stmt = select(UserGroupOperationEssenceLink).where(
            UserGroupOperationEssenceLink.user_group_id == user_group_id,
            UserGroupOperationEssenceLink.operation_essence_link_id
            == operation_essence_link_id,
        )
        result = await self.session.execute(stmt)
        if result.scalar_one_or_none():
            return  # already granted

        ugoel = UserGroupOperationEssenceLink(
            user_group_id=user_group_id,
            operation_essence_link_id=operation_essence_link_id,
        )
        self.session.add(ugoel)
        await self.session.flush()

    async def revoke_from_group(
        self, user_group_id: int, operation_essence_link_id: int
    ) -> None:
        """Revoke a single permission from a user group."""
        stmt = delete(UserGroupOperationEssenceLink).where(
            UserGroupOperationEssenceLink.user_group_id == user_group_id,
            UserGroupOperationEssenceLink.operation_essence_link_id
            == operation_essence_link_id,
        )
        await self.session.execute(stmt)
        await self.session.flush()

    async def set_group_permissions(
        self, user_group_id: int, oel_ids: list[int]
    ) -> None:
        """
        Full replace: set exactly these OEL ids as the group's permissions.
        Adds missing grants, removes revoked grants.
        """
        # Current grants for this group
        current_stmt = select(UserGroupOperationEssenceLink).where(
            UserGroupOperationEssenceLink.user_group_id == user_group_id
        )
        result = await self.session.execute(current_stmt)
        current = {r.operation_essence_link_id: r for r in result.scalars().all()}

        target = set(oel_ids)
        current_ids = set(current.keys())

        # Revoke removed
        for oel_id in current_ids - target:
            await self.session.delete(current[oel_id])

        # Grant new
        for oel_id in target - current_ids:
            self.session.add(
                UserGroupOperationEssenceLink(
                    user_group_id=user_group_id,
                    operation_essence_link_id=oel_id,
                )
            )

        await self.session.flush()

    async def commit(self) -> None:
        await self.session.commit()
