from typing import List, Optional

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.user.user_repository import UserRepository
from backend.api_v1.user.user_schema import (
    User as UserSchema,
    UserCreate,
    UserUpdate,
)
from backend.api_v1.user.user_errors import (
    UserNotFound,
    UserNotFoundByCode,
    UserCodeTaken,
    UserEmailTaken,
    UserDeleteError,
)
from backend.api_v1.base.errors import DomainError


class UserService(BaseService):
    def __init__(
        self,
        repository: UserRepository,
        user: Optional[UserSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    # ------------------------------------------------------------------
    # Internal helper — replaces the old to_schema_with_ops.
    # Always call this instead of UserSchema.model_validate() directly
    # so that the async `operations` field is always populated.
    # ------------------------------------------------------------------

    async def _to_schema(self, orm_user) -> UserSchema:
        """Build a fully-populated UserSchema from an ORM User instance."""
        operations = await self.repository.get_user_operations(orm_user.id)
        schema = UserSchema.model_validate(orm_user)
        # groups comes from the @property on the ORM model (selectin-loaded)
        schema.operations = operations
        return schema

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    async def get_by_id(self, id: int) -> UserSchema:
        result = await self.repository.get_by_id(id)
        if not result:
            exc = UserNotFound(id)
            raise await self._resolve_domain_error(exc)
        return await self._to_schema(result)

    async def get_by_code(self, code: str) -> UserSchema:
        result = await self.repository.get_by_code(code)
        if not result:
            exc = UserNotFoundByCode(code)
            raise await self._resolve_domain_error(exc)
        return await self._to_schema(result)

    async def get_all(self, params: dict | None = None, **kwargs) -> List[UserSchema]:
        users = await self.repository.get_all(filters=params)
        return [await self._to_schema(u) for u in users]

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------

    async def create_user(self, user_in: UserCreate) -> UserSchema:
        if await self.repository.get_by_field("code", user_in.code.strip().upper()):
            exc = UserCodeTaken(user_in.code)
            raise await self._resolve_domain_error(exc)
        if user_in.email and await self.repository.get_by_field("email", user_in.email):
            exc = UserEmailTaken(user_in.email)
            raise await self._resolve_domain_error(exc)
        try:
            orm_user = await self.create(user_in)
            return await self._to_schema(orm_user)
        except IntegrityError:
            exc = UserCodeTaken(user_in.code)
            raise await self._resolve_domain_error(exc)

    async def update_user(self, user_id: int, user_update: UserUpdate) -> UserSchema:
        if user_update.email:
            existing = await self.repository.get_by_field("email", user_update.email)
            if existing and existing.id != user_id:
                exc = UserEmailTaken(user_update.email)
                raise await self._resolve_domain_error(exc)
        try:
            orm_user = await self.repository.get_by_id(user_id)
            if not orm_user:
                exc = UserNotFound(user_id)
                raise await self._resolve_domain_error(exc)
            updated = await self.update(orm_user, user_update, partial=True)
            return await self._to_schema(updated)
        except IntegrityError:
            exc = UserEmailTaken(user_update.email or "")
            raise await self._resolve_domain_error(exc)

    async def delete_user(self, user_id: int) -> None:
        orm_user = await self.repository.get_by_id(user_id)
        if not orm_user:
            exc = UserNotFound(user_id)
            raise await self._resolve_domain_error(exc)
        try:
            await self.delete_by_id(user_id)
        except IntegrityError:
            exc = UserDeleteError(orm_user.code)
            raise await self._resolve_domain_error(exc)

        await self._raise_success(
            message_key="userDeleteSuccess",
            variables={"code": orm_user.code},
            fallback=f"User '{orm_user.code}' successfully deleted",
        )

    # ------------------------------------------------------------------
    # Group management
    # ------------------------------------------------------------------

    async def add_to_group(self, user_id: int, user_group_id: int) -> UserSchema:
        try:
            orm_user = await self.repository.add_to_group(user_id, user_group_id)
            return await self._to_schema(orm_user)
        except DomainError as exc:
            raise await self._resolve_domain_error(exc)

    async def remove_from_group(self, user_id: int, user_group_id: int) -> UserSchema:
        try:
            orm_user = await self.repository.remove_from_group(user_id, user_group_id)
            return await self._to_schema(orm_user)
        except DomainError as exc:
            raise await self._resolve_domain_error(exc)

    async def set_groups(self, user_id: int, user_group_ids: List[int]) -> UserSchema:
        try:
            orm_user = await self.repository.set_groups(user_id, user_group_ids)
            return await self._to_schema(orm_user)
        except DomainError as exc:
            raise await self._resolve_domain_error(exc)

    # ------------------------------------------------------------------
    # Job-group sync
    # ------------------------------------------------------------------

    async def sync_groups_from_job(self, user_id: int) -> UserSchema:
        """
        Sync a single user's groups from their job's groups.
        Adds any missing job-group links to the user; does not remove extras.
        Raises UserNotFound (translated) if the user does not exist.
        """
        try:
            orm_user, added, _ = await self.repository.sync_groups_from_job(user_id)
            return await self._to_schema(orm_user)
        except DomainError as exc:
            raise await self._resolve_domain_error(exc)

    async def sync_job_users_groups(self, job_id: int) -> "SyncJobResult":
        """
        Sync groups for every user assigned to a given job.
        Returns a summary: total users processed, links added, links removed.
        """
        user_ids = await self.repository.get_user_ids_by_job(job_id)

        total_users = len(user_ids)
        total_added = 0
        total_removed = 0

        for uid in user_ids:
            try:
                _, added, removed = await self.repository.sync_groups_from_job(uid)
                total_added += added
                total_removed += removed
            except DomainError:
                pass

        return SyncJobResult(
            job_id=job_id,
            users_processed=total_users,
            links_added=total_added,
            links_removed=total_removed,
        )


# ------------------------------------------------------------------
# Response schemas for sync endpoints
# ------------------------------------------------------------------

from pydantic import BaseModel  # noqa: E402


class SyncUserResult(BaseModel):
    user_id: int
    links_added: int
    links_removed: int


class SyncJobResult(BaseModel):
    job_id: int
    users_processed: int
    links_added: int
    links_removed: int


class SyncAllResult(BaseModel):
    jobs_processed: int
    users_processed: int
    links_added: int
    links_removed: int
