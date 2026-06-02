# backend/api_v1/operation_essence_set_link/operation_essence_set_link_service.py
from typing import List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.operation_essence_set_link.operation_essence_set_link_repository import (
    OperationEssenceSetLinkRepository,
)
from backend.api_v1.operation_essence_set_link.operation_essence_set_link_model import (
    OperationEssenceSetLink,
)
from backend.api_v1.operation_essence_set_link.operation_essence_set_link_schema import (
    OperationEssenceSetLinkSchema,
    OperationEssenceSetLinkCreate,
)
from backend.api_v1.operation_essence_set_link.operation_essence_set_link_errors import (
    OperationEssenceSetLinkNotFound,
    OperationEssenceSetLinkDuplicate,
)
from backend.api_v1.operation_essence_set_link.operation_essence_set_link_success import (
    OperationEssenceSetLinkCreateSuccess,
    OperationEssenceSetLinkDeleteSuccess,
)
from backend.api_v1.essence_set.essence_set_service import EssenceSetService
from backend.api_v1.table_relationship_links.user_group_operation_essence_set_link_model import (
    UserGroupOperationEssenceSetLink,
)
from sqlalchemy import select, delete


class OperationEssenceSetLinkService(BaseService):
    """
    Manages set-grain permissions: (operation, {essence, ...}).

    Creating a permission composes the EssenceSet get-or-create: the caller
    passes operation_id + a list of essence ids, the essence set is resolved
    (or created) by fingerprint, and the permission row is created against it.
    """

    def __init__(
        self,
        repository: OperationEssenceSetLinkRepository,
        essence_set_service: EssenceSetService,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, session=session)
        self.essence_set_service = essence_set_service

    # ── Helpers ────────────────────────────────────────────────────────────────

    @staticmethod
    def _label(link: OperationEssenceSetLink) -> str:
        """Human-readable label, e.g. 'delete · 3-7' or 'delete · talent_period'."""
        names = ", ".join(link.essence_names) if link.essence_names else link.fingerprint
        return f"{link.operation_name} · {names}"

    def _to_schema(self, link: OperationEssenceSetLink) -> OperationEssenceSetLinkSchema:
        group_names = [
            ug.user_group.name
            for ug in link.user_group_links
            if ug.user_group
        ]
        return OperationEssenceSetLinkSchema(
            id=link.id,
            operation_id=link.operation_id,
            operation_name=link.operation_name,
            essence_set_id=link.essence_set_id,
            fingerprint=link.fingerprint,
            essence_names=link.essence_names,
            user_group_names=group_names,
        )

    # ── Read ────────────────────────────────────────────────────────────────────

    async def get_all(self) -> List[OperationEssenceSetLinkSchema]:
        links = await self.repository.get_all_links()
        return [self._to_schema(link) for link in links]

    async def get_by_id(self, link_id: int) -> OperationEssenceSetLink:
        link = await self.repository.get_by_id(link_id)
        if not link:
            raise await self._resolve_domain_error(
                OperationEssenceSetLinkNotFound(link_id)
            )
        return link

    # ── Write ─────────────────────────────────────────────────────────────────

    async def create(
        self, data: OperationEssenceSetLinkCreate
    ) -> MutationResponse[OperationEssenceSetLinkSchema]:
        # Resolve (or create) the canonical essence set first.
        essence_set = await self.essence_set_service.get_or_create(data.essence_ids)

        # Reject duplicate permission (operation + same set).
        existing = await self.repository.get_by_operation_and_set(
            data.operation_id, essence_set.id
        )
        if existing:
            raise await self._resolve_domain_error(
                OperationEssenceSetLinkDuplicate(
                    existing.operation_name, essence_set.fingerprint
                )
            )

        link = OperationEssenceSetLink(
            operation_id=data.operation_id,
            essence_set_id=essence_set.id,
        )
        created = await self.repository.create(link)
        # Re-fetch so operation / essence_set relationships are loaded for the label.
        created = await self.get_by_id(created.id)

        detail = await self._resolve_domain_success(
            OperationEssenceSetLinkCreateSuccess(self._label(created))
        )
        return MutationResponse(detail=detail, data=self._to_schema(created))

    async def delete(self, link_id: int) -> None:
        link = await self.get_by_id(link_id)
        label = self._label(link)
        await self.delete_by_id(
            link_id,
            name=label,
            delete_success_exc=OperationEssenceSetLinkDeleteSuccess,
        )

    # ── Group grant / revoke (UGOESL) ───────────────────────────────────────────
    #
    # Set-grain sibling of OperationEssenceLinkService's group methods.
    # Mirrors the legacy grant_to_group / revoke_from_group / set_group_permissions
    # so the frontend permissions dialog works identically, just against the
    # set-grain tables.

    async def get_for_user_group(
        self, user_group_id: int
    ) -> List[OperationEssenceSetLinkSchema]:
        """All set-grain permissions currently granted to a user group."""
        stmt = (
            select(OperationEssenceSetLink)
            .join(
                UserGroupOperationEssenceSetLink,
                UserGroupOperationEssenceSetLink.operation_essence_set_link_id
                == OperationEssenceSetLink.id,
            )
            .where(UserGroupOperationEssenceSetLink.user_group_id == user_group_id)
        )
        result = await self.session.execute(stmt)
        links = list(result.scalars().all())
        return [self._to_schema(link) for link in links]

    async def grant_to_group(
        self, user_group_id: int, operation_essence_set_link_id: int
    ) -> None:
        """Grant a single set-grain permission to a user group (idempotent)."""
        stmt = select(UserGroupOperationEssenceSetLink).where(
            UserGroupOperationEssenceSetLink.user_group_id == user_group_id,
            UserGroupOperationEssenceSetLink.operation_essence_set_link_id
            == operation_essence_set_link_id,
        )
        result = await self.session.execute(stmt)
        if result.scalar_one_or_none():
            return  # already granted

        self.session.add(
            UserGroupOperationEssenceSetLink(
                user_group_id=user_group_id,
                operation_essence_set_link_id=operation_essence_set_link_id,
            )
        )
        await self.session.commit()

    async def revoke_from_group(
        self, user_group_id: int, operation_essence_set_link_id: int
    ) -> None:
        """Revoke a single set-grain permission from a user group."""
        stmt = delete(UserGroupOperationEssenceSetLink).where(
            UserGroupOperationEssenceSetLink.user_group_id == user_group_id,
            UserGroupOperationEssenceSetLink.operation_essence_set_link_id
            == operation_essence_set_link_id,
        )
        await self.session.execute(stmt)
        await self.session.commit()

    async def set_group_permissions(
        self, user_group_id: int, oesl_ids: List[int]
    ) -> None:
        """
        Full replace: set exactly these OESL ids as the group's set-grain
        permissions. Adds missing grants, removes revoked grants.
        """
        current_stmt = select(UserGroupOperationEssenceSetLink).where(
            UserGroupOperationEssenceSetLink.user_group_id == user_group_id
        )
        result = await self.session.execute(current_stmt)
        current = {
            r.operation_essence_set_link_id: r for r in result.scalars().all()
        }

        target = set(oesl_ids)
        current_ids = set(current.keys())

        for oesl_id in current_ids - target:
            await self.session.delete(current[oesl_id])

        for oesl_id in target - current_ids:
            self.session.add(
                UserGroupOperationEssenceSetLink(
                    user_group_id=user_group_id,
                    operation_essence_set_link_id=oesl_id,
                )
            )

        await self.session.commit()
