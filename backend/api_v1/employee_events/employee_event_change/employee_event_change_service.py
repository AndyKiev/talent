
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.employee_events.employee_event.employee_event_repository import (
    EmployeeEventRepository,
)
from backend.api_v1.employee_events.employee_event_change.employee_event_change_messages import (
    EmployeeEventChangeCreateSuccess,
    EmployeeEventChangeDeleteError,
    EmployeeEventChangeDeleteSuccess,
    EmployeeEventChangeDirectionDuplicate,
    EmployeeEventChangeEventNotDraft,
    EmployeeEventChangeNotFound,
    EmployeeEventChangeUpdateSuccess,
)
from backend.api_v1.employee_events.employee_event_change.employee_event_change_repository import (
    EmployeeEventChangeRepository,
)
from backend.api_v1.employee_events.employee_event_change.employee_event_change_schema import (
    EmployeeEventChangeCreate,
    EmployeeEventChangeSchema,
    EmployeeEventChangeUpdate,
)
from backend.api_v1.employee_events.employee_event_change_department.employee_event_change_department_repository import (
    EmployeeEventChangeDepartmentRepository,
)
from backend.api_v1.employee_events.employee_event_status.employee_event_status_repository import (
    EmployeeEventStatusRepository,
)

# Statuses that allow editing change rows.
EDITABLE_STATUSES = ("draft", "ready")


class EmployeeEventChangeService(BaseService):
    def __init__(
        self,
        repository: EmployeeEventChangeRepository,
        user: EmployeeSchema | None = None,
        session: AsyncSession | None = None,
    ):
        super().__init__(repository, user=user, session=session)
        self._event_repo = EmployeeEventRepository(session=session)
        self._status_repo = EmployeeEventStatusRepository(session=session)

    # ── Guards ──────────────────────────────────────────────────────────────────

    async def _assert_event_editable(self, event_id: int) -> None:
        """Raise if the parent event is not in an editable status (draft or ready)."""
        event = await self._event_repo.get_by_id(event_id)
        if not event or not event.status or event.status.name not in EDITABLE_STATUSES:
            raise await self._resolve_domain_error(
                EmployeeEventChangeEventNotDraft(event_id)
            )

    # ── draft <-> ready auto-transition ──────────────────────────────────────────

    async def _sync_event_status(self, event_id: int) -> None:
        """
        Recompute draft/ready based on whether all REQUIRED directions
        of the event's type have a corresponding change row.

        - all required filled  -> 'ready'
        - some required missing -> 'draft'
        Applied (or any non-editable) events are left untouched.
        """
        # Expire all cached ORM objects so the re-read picks up any
        # just-committed inserts or deletes (e.g. a change row deletion
        # that should flip ready -> draft).
        self.session.expire_all()

        event = await self._event_repo.get_by_id(event_id)
        if not event or not event.status:
            return
        if event.status.name not in EDITABLE_STATUSES:
            return  # never touch applied events

        # Required direction_type_ids for this event's type
        required_ids = {
            td.direction_type_id
            for td in (event.event_type.type_directions if event.event_type else [])
            if td.is_required
        }

        # direction_type_ids already covered by change rows on this event
        filled_ids = {c.direction_type_id for c in (event.changes or [])}

        all_required_filled = required_ids.issubset(filled_ids)
        target_name = "ready" if all_required_filled else "draft"

        if event.status.name == target_name:
            return  # already correct

        target_status = await self._status_repo.get_by_field("name", target_name)
        if not target_status:
            return  # status row missing; leave as-is rather than crash

        event.status_id = target_status.id
        await self.session.commit()

    # ── Reads ─────────────────────────────────────────────────────────────────────

    async def get_by_id(self, change_id: int) -> EmployeeEventChangeSchema:
        result = await self.repository.get_by_id(change_id)
        if not result:
            raise await self._resolve_domain_error(
                EmployeeEventChangeNotFound(change_id)
            )
        return result

    async def get_event_changes(
        self,
        event_id: int,
        sort: str | None = None,
    ) -> list[EmployeeEventChangeSchema]:
        records = await self.repository.get_all(
            filters={"event_id": event_id},
            sort=sort,
        )
        return [EmployeeEventChangeSchema.model_validate(r) for r in records]

    # ── Mutations ───────────────────────────────────────────────────────────────

    async def create_event_change(
        self,
        event_id: int,
        change_in: EmployeeEventChangeCreate,
    ) -> MutationResponse[EmployeeEventChangeSchema]:
        await self._assert_event_editable(event_id)

        # Guard: one change row per direction type per event
        existing = await self.repository.get_all(
            filters={
                "event_id": event_id,
                "direction_type_id": change_in.direction_type_id,
            }
        )
        if existing:
            raise await self._resolve_domain_error(
                EmployeeEventChangeDirectionDuplicate(
                    change_in.direction_type_id, event_id
                )
            )

        try:
            change_data = change_in.model_dump(exclude={"dept_changes"})
            change_data["event_id"] = event_id
            orm_change = await self.repository.create_from_dict(change_data)

            if change_in.dept_changes:
                dept_repo = EmployeeEventChangeDepartmentRepository(
                    session=self.session
                )
                for dept_in in change_in.dept_changes:
                    dept_data = dept_in.model_dump()
                    dept_data["event_change_id"] = orm_change.id
                    await dept_repo.create_from_dict(dept_data)

            # Flip draft -> ready if all required directions are now filled
            await self._sync_event_status(event_id)

            await self.session.refresh(orm_change)
            schema = EmployeeEventChangeSchema.model_validate(orm_change)
            detail = await self._resolve_domain_success(
                EmployeeEventChangeCreateSuccess(schema.id)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError as exc:
            raise await self._resolve_domain_error(
                EmployeeEventChangeNotFound(0)
            ) from exc

    async def update_event_change(
        self,
        change_id: int,
        change_update: EmployeeEventChangeUpdate,
    ) -> MutationResponse[EmployeeEventChangeSchema]:
        orm_record = await self.get_by_id(change_id)
        await self._assert_event_editable(orm_record.event_id)
        updated = await self.update(orm_record, change_update, partial=True)
        # editing values doesn't change which directions are filled,
        # but re-sync is cheap and safe.
        await self._sync_event_status(orm_record.event_id)
        schema = EmployeeEventChangeSchema.model_validate(updated)
        detail = await self._resolve_domain_success(
            EmployeeEventChangeUpdateSuccess(schema.id)
        )
        return MutationResponse(detail=detail, data=schema)

    async def delete_event_change(self, change_id: int) -> None:
        orm_record = await self.get_by_id(change_id)
        event_id = orm_record.event_id
        await self._assert_event_editable(event_id)

        # Delete via repository (the BaseService.delete_by_id helper raises an
        # HTTPException on success, which would skip the status re-sync below,
        # so we delete directly, re-sync, then signal success ourselves).
        try:
            await self.repository.delete_by_id(change_id)
        except IntegrityError:
            raise await self._resolve_domain_error(
                EmployeeEventChangeDeleteError(change_id)
            )

        # Removing a change may break the required set -> drop back to draft
        await self._sync_event_status(event_id)

        success = EmployeeEventChangeDeleteSuccess(change_id)
        await self._raise_success(
            message_key=success.message_key,
            variables=success.template_vars,
            fallback=success.fallback,
        )
