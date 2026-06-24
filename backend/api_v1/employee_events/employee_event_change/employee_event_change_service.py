from typing import Optional, List

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee_events.employee_event_change.employee_event_change_repository import (
    EmployeeEventChangeRepository,
)
from backend.api_v1.employee_events.employee_event_change.employee_event_change_schema import (
    EmployeeEventChangeSchema,
    EmployeeEventChangeCreate,
    EmployeeEventChangeUpdate,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.employee_events.employee_event_change.employee_event_change_errors import (
    EmployeeEventChangeNotFound,
    EmployeeEventChangeDeleteError,
    EmployeeEventChangeEventNotDraft,
    EmployeeEventChangeDirectionDuplicate,
)
from backend.api_v1.employee_events.employee_event_change.employee_event_change_success import (
    EmployeeEventChangeDeleteSuccess,
    EmployeeEventChangeCreateSuccess,
    EmployeeEventChangeUpdateSuccess,
)
from backend.api_v1.employee_events.employee_event.employee_event_repository import (
    EmployeeEventRepository,
)


class EmployeeEventChangeService(BaseService):
    def __init__(
        self,
        repository: EmployeeEventChangeRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)
        self._event_repo = EmployeeEventRepository(session=session)

    async def _assert_event_is_draft(self, event_id: int) -> None:
        """Raise if the parent event is not in draft status."""
        event = await self._event_repo.get_by_id(event_id)
        if not event or not event.status or event.status.name != "draft":
            raise await self._resolve_domain_error(
                EmployeeEventChangeEventNotDraft(event_id)
            )

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
        sort: Optional[str] = None,
    ) -> List[EmployeeEventChangeSchema]:
        records = await self.repository.filter_by(
            filters={"event_id": event_id},
            sort_json=sort,
        )
        return [EmployeeEventChangeSchema.model_validate(r) for r in records]

    async def create_event_change(
        self,
        event_id: int,
        change_in: EmployeeEventChangeCreate,
    ) -> MutationResponse[EmployeeEventChangeSchema]:
        await self._assert_event_is_draft(event_id)

        # Guard: one change row per direction type per event
        existing = await self.repository.filter_by(
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
        await self._assert_event_is_draft(orm_record.event_id)
        updated = await self.update(orm_record, change_update, partial=True)
        schema = EmployeeEventChangeSchema.model_validate(updated)
        detail = await self._resolve_domain_success(
            EmployeeEventChangeUpdateSuccess(schema.id)
        )
        return MutationResponse(detail=detail, data=schema)

    async def delete_event_change(self, change_id: int) -> None:
        orm_record = await self.get_by_id(change_id)
        await self._assert_event_is_draft(orm_record.event_id)
        await self.delete_by_id(
            change_id,
            name=change_id,
            delete_error_exc=EmployeeEventChangeDeleteError,
            delete_success_exc=EmployeeEventChangeDeleteSuccess,
        )
