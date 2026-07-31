from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee.employee_minis import fetch_employee_minis
from backend.api_v1.employee.employee_model import Employee
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.employee_department.employee_department_model import (
    EmployeeDepartment,
)
from backend.api_v1.person.person_model import Person
from backend.api_v1.person_events.person_event.person_event_messages import (
    PersonEventCreateSuccess,
    PersonEventDeleteSuccess,
    PersonEventInvalidTransition,
    PersonEventNotEditable,
    PersonEventNotFound,
    PersonEventNotPermittedForSex,
    PersonEventOutOfScope,
    PersonEventSexUnknown,
    PersonEventStatusChangeSuccess,
    PersonEventTypeNotFound,
)
from backend.api_v1.person_events.person_event.person_event_model import PersonEvent
from backend.api_v1.person_events.person_event.person_event_repository import (
    PersonEventRepository,
)
from backend.api_v1.person_events.person_event.person_event_schema import (
    LastNameChangeCreate,
    PersonEventSchema,
)
from backend.api_v1.person_events.person_event_change.person_event_change_model import (
    FIELD_LAST_NAME,
    PersonEventChange,
)
from backend.api_v1.person_events.person_event_state_machine import (
    InvalidPersonEventTransition,
    allowed_targets,
    resolve_person_event_transition,
)
from backend.api_v1.person_events.person_event_status.person_event_status_model import (
    STATUS_APPLIED,
    STATUS_DRAFT,
    PersonEventStatus,
)
from backend.api_v1.person_events.person_event_type.person_event_type_model import (
    LAST_NAME_CHANGE,
    PersonEventType,
)
from backend.api_v1.sex.sex_model import FEMALE_SEX_ID
from backend.utils.person_names import normalize_name_part

# When ON (the default) a LAST_NAME_CHANGE may only be recorded for a woman —
# the case the feature was built for is marriage. Turning it OFF lifts the
# check entirely rather than widening it case by case.
FEMALE_ONLY_KEY = "person_last_name_change_female_only"


class PersonEventService(BaseService):
    """Person-level events: recorded by HR, applied on their effective date.

    The apply step is what writes `persons`. Creating an event changes nothing,
    which is what makes a back-dated correction safe to enter and to withdraw.
    """

    def __init__(
        self,
        repository: PersonEventRepository,
        user: EmployeeSchema | None = None,
        session: AsyncSession | None = None,
    ) -> None:
        super().__init__(repository, user=user, session=session)

    # ── lookups ───────────────────────────────────────────────────────────────

    async def _type_id(self, key: str) -> int:
        type_id = await self.session.scalar(
            select(PersonEventType.id).where(PersonEventType.key == key)
        )
        if type_id is None:
            raise await self._resolve_domain_error(PersonEventTypeNotFound(key))
        return type_id

    async def _status_id(self, name: str) -> int:
        return await self.session.scalar(
            select(PersonEventStatus.id).where(PersonEventStatus.name == name)
        )

    async def _set_status(self, record: PersonEvent, name: str) -> None:
        """Move an event to a status by ASSIGNING THE RELATIONSHIP, not just the FK.

        The session runs with expire_on_commit=False, so writing `status_id` alone
        leaves `record.status` pointing at the old row: the commit does not expire
        it and the identity map hands the same stale object back to the very next
        read. Every caller here returns the event in its response, so the stale
        nested status would be exactly what the client sees.
        """
        status = await self.session.scalar(
            select(PersonEventStatus).where(PersonEventStatus.name == name)
        )
        record.status = status
        record.status_id = status.id

    # ── access ────────────────────────────────────────────────────────────────

    async def _assert_in_scope(self, person_id: int) -> None:
        """admin / HRS / dev act on anyone; HRM only inside their scope.

        Reuses the SAME resolver the employees list uses, so a change to what
        "in scope" means lands in both places at once. A person is in scope when
        ANY of their employee records has a main department inside it — a person
        may hold more than one over time, and the newest one is not necessarily
        the one the HRM manages.
        """
        from backend.api_v1.employee.employee_repository import EmployeeRepository
        from backend.api_v1.employee.employee_service import EmployeeService

        employee_service = EmployeeService(
            repository=EmployeeRepository(session=self.session),
            user=self.user,
            session=self.session,
        )
        allowed = await employee_service._resolve_visible_main_department_ids()
        if allowed is None:
            return  # bypass group: unrestricted
        if not allowed:
            raise await self._resolve_domain_error(PersonEventOutOfScope())

        visible = await self.session.scalar(
            select(Employee.id)
            .join(EmployeeDepartment, EmployeeDepartment.employee_id == Employee.id)
            .where(
                Employee.person_id == person_id,
                EmployeeDepartment.department_id.in_(allowed),
            )
            .limit(1)
        )
        if visible is None:
            raise await self._resolve_domain_error(PersonEventOutOfScope())

    async def _assert_sex_allows_last_name_change(self, person: Person) -> None:
        from backend.api_v1.app_setting.app_setting_service import get_bool_setting

        if not await get_bool_setting(self.session, FEMALE_ONLY_KEY, default=True):
            return
        if person.sex_id is None:
            raise await self._resolve_domain_error(PersonEventSexUnknown())
        if person.sex_id != FEMALE_SEX_ID:
            raise await self._resolve_domain_error(PersonEventNotPermittedForSex())

    # ── reads ─────────────────────────────────────────────────────────────────

    async def get_by_id(self, id: int) -> PersonEvent:
        record = await self.repository.get_by_id(id)
        if not record:
            raise await self._resolve_domain_error(PersonEventNotFound(id))
        return record

    async def _to_schema(self, records: list[PersonEvent]) -> list[PersonEventSchema]:
        minis = await fetch_employee_minis(
            self.session, [r.created_by for r in records]
        )
        out: list[PersonEventSchema] = []
        for record in records:
            schema = PersonEventSchema.model_validate(record)
            mini = minis.get(record.created_by)
            schema.created_by_name = mini["name"] if mini else None
            schema.allowed_targets = allowed_targets(
                record.status.name if record.status else STATUS_DRAFT
            )
            out.append(schema)
        return out

    async def get_person_events(self, person_id: int) -> list[PersonEventSchema]:
        await self._assert_in_scope(person_id)
        return await self._to_schema(await self.repository.get_for_person(person_id))

    # ── writes ────────────────────────────────────────────────────────────────

    async def create_last_name_change(
        self, person_id: int, payload: LastNameChangeCreate
    ) -> MutationResponse[PersonEventSchema]:
        await self._assert_in_scope(person_id)
        person = await self.session.get(Person, person_id)
        if person is None:
            raise await self._resolve_domain_error(PersonEventNotFound(person_id))
        await self._assert_sex_allows_last_name_change(person)

        new_last = normalize_name_part(payload.new_last_name)
        event = PersonEvent(
            person_id=person_id,
            event_type_id=await self._type_id(LAST_NAME_CHANGE),
            status_id=await self._status_id(STATUS_DRAFT),
            effective_date=payload.effective_date,
            description=payload.description,
            created_by=self.user.id if self.user else None,
        )
        self.session.add(event)
        await self.session.flush()
        # prev_value stays NULL until apply: what the surname WAS is only known
        # for certain at the moment it is replaced.
        self.session.add(
            PersonEventChange(
                event_id=event.id,
                field_key=FIELD_LAST_NAME,
                new_value=new_last,
            )
        )
        await self.session.commit()

        fresh = await self.get_by_id(event.id)
        detail = await self._resolve_domain_success(PersonEventCreateSuccess())
        return MutationResponse(detail=detail, data=(await self._to_schema([fresh]))[0])

    async def change_status(
        self, event_id: int, target_status: str
    ) -> MutationResponse[PersonEventSchema]:
        record = await self.get_by_id(event_id)
        await self._assert_in_scope(record.person_id)
        current = record.status.name if record.status else STATUS_DRAFT
        try:
            resolved = resolve_person_event_transition(current, target_status, event_id)
        except InvalidPersonEventTransition as exc:
            raise await self._resolve_domain_error(
                PersonEventInvalidTransition(exc.current, exc.target)
            )

        if resolved == STATUS_APPLIED:
            await self._apply(record)
        await self._set_status(record, resolved)
        await self.session.commit()

        fresh = await self.get_by_id(event_id)
        detail = await self._resolve_domain_success(
            PersonEventStatusChangeSuccess(resolved)
        )
        return MutationResponse(detail=detail, data=(await self._to_schema([fresh]))[0])

    async def delete_person_event(self, event_id: int) -> str:
        record = await self.get_by_id(event_id)
        await self._assert_in_scope(record.person_id)
        if record.status and record.status.name == STATUS_APPLIED:
            raise await self._resolve_domain_error(PersonEventNotEditable())
        await self.session.delete(record)
        await self.session.commit()
        return await self._resolve_domain_success(PersonEventDeleteSuccess())

    # ── apply ─────────────────────────────────────────────────────────────────

    async def _apply(self, event: PersonEvent) -> None:
        """Project the event onto the person. Does NOT commit or move the status
        — the caller owns both, so an apply and its status flip land together.

        Every display name in the app is composed from these columns on read, so
        writing them here is the whole of the update: no employee row to touch,
        no cache to rebuild.
        """
        person = await self.session.get(Person, event.person_id)
        if person is None:
            raise await self._resolve_domain_error(PersonEventNotFound(event.id))
        for change in event.changes:
            if change.field_key != FIELD_LAST_NAME:
                # Unknown field_key: a type added later whose projection is not
                # implemented yet. Skipping silently would apply an event that
                # changed nothing, so refuse loudly instead.
                raise await self._resolve_domain_error(PersonEventNotEditable())
            change.prev_value = person.last_name
            person.last_name = change.new_value

    async def apply_due_person_events(self, on_or_before: date | None = None) -> dict:
        """Scheduler sweep: apply every ready event whose date has arrived.

        One event's failure must not strand the rest, so each is applied in its
        own transaction and failures are reported rather than raised.
        """
        due = await self.repository.get_due_ready_events(on_or_before)
        applied_ids: list[int] = []
        failures: list[dict] = []
        for event in due:
            try:
                await self._apply(event)
                await self._set_status(event, STATUS_APPLIED)
                await self.session.commit()
                applied_ids.append(event.id)
            except Exception as exc:  # noqa: BLE001 — reported, not swallowed
                await self.session.rollback()
                failures.append({"event_id": event.id, "error": str(exc)})
        return {
            "checked": len(due),
            "applied": len(applied_ids),
            "failed": len(failures),
            "applied_ids": applied_ids,
            "failures": failures,
        }
