from typing import Optional, List

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee_events.employee_event.employee_event_repository import (
    EmployeeEventRepository,
)
from backend.api_v1.employee_events.employee_event.employee_event_schema import (
    EmployeeEventSchema,
    EmployeeEventFlat,
    EmployeeEventCreate,
    EmployeeEventUpdate,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.employee_events.employee_event.employee_event_errors import (
    EmployeeEventNotFound,
    EmployeeEventDeleteError,
    EmployeeEventAlreadyApplied,
    EmployeeEventNotDraft,
)
from backend.api_v1.employee_events.employee_event.employee_event_success import (
    EmployeeEventDeleteSuccess,
    EmployeeEventCreateSuccess,
    EmployeeEventUpdateSuccess,
    EmployeeEventApplySuccess,
)
from backend.api_v1.employee_events.employee_event_status.employee_event_status_service import (
    EmployeeEventStatusService,
)
from backend.api_v1.employee_events.employee_event_change.employee_event_change_repository import (
    EmployeeEventChangeRepository,
)


class EmployeeEventService(BaseService):
    def __init__(
        self,
        repository: EmployeeEventRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def get_by_id(self, event_id: int) -> EmployeeEventSchema:
        result = await self.repository.get_by_id(event_id)
        if not result:
            raise await self._resolve_domain_error(EmployeeEventNotFound(event_id))
        return result

    async def get_employee_events(
        self,
        employee_id: int,
        sort: Optional[str] = None,
    ) -> List[EmployeeEventFlat]:
        records = await self.repository.filter_by(
            filters={"employee_id": employee_id},
            sort_json=sort,
        )
        return [EmployeeEventFlat.model_validate(r) for r in records]

    async def create_employee_event(
        self,
        employee_id: int,
        event_in: EmployeeEventCreate,
    ) -> MutationResponse[EmployeeEventSchema]:
        """
        Creates the event header and all provided change rows in one transaction.
        `employee_id` is injected from the URL path.
        `created_by` is injected from the authenticated session user.
        """
        try:
            # Build a dict so we can inject path/session fields
            event_data = event_in.model_dump(exclude={"changes"})
            event_data["employee_id"] = employee_id
            event_data["created_by"] = self.user.id

            orm_event = await self.repository.create_from_dict(event_data)

            # Persist each change row linked to the new event
            if event_in.changes:
                change_repo = EmployeeEventChangeRepository(session=self.session)
                for change_in in event_in.changes:
                    change_data = change_in.model_dump(exclude={"dept_changes"})
                    change_data["event_id"] = orm_event.id
                    orm_change = await change_repo.create_from_dict(change_data)

                    if change_in.dept_changes:
                        from backend.api_v1.employee_events.employee_event_change_department.employee_event_change_department_repository import (
                            EmployeeEventChangeDepartmentRepository,
                        )

                        dept_repo = EmployeeEventChangeDepartmentRepository(
                            session=self.session
                        )
                        for dept_in in change_in.dept_changes:
                            dept_data = dept_in.model_dump()
                            dept_data["event_change_id"] = orm_change.id
                            await dept_repo.create_from_dict(dept_data)

            await self.session.refresh(orm_event)
            schema = EmployeeEventSchema.model_validate(orm_event)
            detail = await self._resolve_domain_success(
                EmployeeEventCreateSuccess(schema.id)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError as exc:
            raise await self._resolve_domain_error(EmployeeEventNotFound(0)) from exc

    async def update_employee_event(
        self,
        event_id: int,
        event_update: EmployeeEventUpdate,
    ) -> MutationResponse[EmployeeEventSchema]:
        orm_record = await self.get_by_id(event_id)
        # Guard: only draft events may be patched
        if orm_record.status and orm_record.status.name != "draft":
            raise await self._resolve_domain_error(EmployeeEventNotDraft(event_id))
        updated = await self.update(orm_record, event_update, partial=True)
        schema = EmployeeEventSchema.model_validate(updated)
        detail = await self._resolve_domain_success(
            EmployeeEventUpdateSuccess(schema.id)
        )
        return MutationResponse(detail=detail, data=schema)

    async def apply_employee_event(
        self,
        event_id: int,
        applied_status_id: int,
    ) -> MutationResponse[EmployeeEventSchema]:
        """
        Transitions the event from `draft` to `applied` by updating `status_id`.
        The caller resolves the applied-status ID (e.g. from the dependency layer
        or a seeded constant) and passes it in.
        """
        orm_record = await self.get_by_id(event_id)
        if orm_record.status and orm_record.status.name == "applied":
            raise await self._resolve_domain_error(
                EmployeeEventAlreadyApplied(event_id)
            )
        updated = await self.update(
            orm_record,
            EmployeeEventUpdate(status_id=applied_status_id),
            partial=True,
        )
        schema = EmployeeEventSchema.model_validate(updated)
        detail = await self._resolve_domain_success(
            EmployeeEventApplySuccess(schema.id)
        )
        return MutationResponse(detail=detail, data=schema)

    async def delete_employee_event(self, event_id: int) -> None:
        orm_record = await self.get_by_id(event_id)
        # Guard: only draft events may be deleted
        if orm_record.status and orm_record.status.name != "draft":
            raise await self._resolve_domain_error(EmployeeEventNotDraft(event_id))
        await self.delete_by_id(
            event_id,
            name=event_id,
            delete_error_exc=EmployeeEventDeleteError,
            delete_success_exc=EmployeeEventDeleteSuccess,
        )
