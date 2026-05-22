from sqlalchemy import select, delete
from backend.api_v1.operation.operation_model import Operation
from backend.api_v1.user_group.user_group_model import UserGroup
from backend.api_v1.table_relationship_links.operation_user_group_link_model import (
    OperationUserGroupLink,
)
from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.operation.operation_errors import (
    OperationNotFound,
    OperationAlreadyInGroup,
    OperationNotInGroup,
    OperationGroupNotFound,
    OperationGroupsNotFound,
)


class OperationRepository(BaseRepository):
    model = Operation

    async def _get_operation_and_group(
        self, operation_id: int, group_id: int
    ) -> tuple[Operation, UserGroup]:
        """Get operation and group by IDs, raise appropriate errors if not found."""
        operation = await self.get_by_id(operation_id)
        if not operation:
            raise OperationNotFound(operation_id)

        group = (
            await self.session.execute(
                select(UserGroup).where(UserGroup.id == group_id)
            )
        ).scalar_one_or_none()
        if not group:
            raise OperationGroupNotFound(group_id)

        return operation, group

    async def _get_association(
        self, operation_id: int, group_id: int
    ) -> OperationUserGroupLink | None:
        """Get association between operation and group if it exists."""
        return (
            await self.session.execute(
                select(OperationUserGroupLink).where(
                    OperationUserGroupLink.operation_id == operation_id,
                    OperationUserGroupLink.user_group_id == group_id,
                )
            )
        ).scalar_one_or_none()

    async def add_operation_to_user_group(
        self, operation_id: int, user_group_id: int
    ) -> Operation:
        operation, group = await self._get_operation_and_group(
            operation_id, user_group_id
        )
        association = await self._get_association(operation_id, user_group_id)
        if association:
            raise OperationAlreadyInGroup(operation.name, group.name)

        self.session.add(
            OperationUserGroupLink(
                operation_id=operation_id, user_group_id=user_group_id
            )
        )
        await self.session.commit()
        return await self.get_by_id(operation_id)

    async def remove_operation_from_user_group(
        self, operation_id: int, user_group_id: int
    ) -> Operation:
        operation, group = await self._get_operation_and_group(
            operation_id, user_group_id
        )
        association = await self._get_association(operation_id, user_group_id)
        if not association:
            raise OperationNotInGroup(operation.name, group.name)

        await self.session.delete(association)
        await self.session.commit()
        return await self.get_by_id(operation_id)

    async def set_operation_user_groups(
        self, operation_id: int, user_group_ids: list[int]
    ) -> Operation:
        """Replace all group table_relationship_links for an operation."""
        if not await self.get_by_id(operation_id):
            raise OperationNotFound(operation_id)

        existing_groups = (
            (
                await self.session.execute(
                    select(UserGroup).where(UserGroup.id.in_(user_group_ids))
                )
            )
            .scalars()
            .all()
        )

        if len(existing_groups) != len(user_group_ids):
            missing = set(user_group_ids) - {g.id for g in existing_groups}
            raise OperationGroupsNotFound(missing)

        await self.session.execute(
            delete(OperationUserGroupLink).where(
                OperationUserGroupLink.operation_id == operation_id
            )
        )
        self.session.add_all(
            [
                OperationUserGroupLink(operation_id=operation_id, user_group_id=gid)
                for gid in user_group_ids
            ]
        )
        await self.session.commit()
        return await self.get_by_id(operation_id)
