from typing import Optional, List

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.person.person_model import Person
from backend.api_v1.person.person_repository import PersonRepository
from backend.api_v1.person.person_schema import (
    PersonSchema,
    PersonCreate,
    PersonUpdate,
    PersonEmployeeSlim,
    PersonNameMatch,
    PersonCheckNameResponse,
)
from backend.api_v1.person.person_messages import (
    PersonNotFound,
    PersonNotFoundForEmployee,
    PersonNameExists,
    PersonHasEmployees,
)
from backend.api_v1.person.person_messages import (
    PersonDeleteSuccess,
    PersonCreateSuccess,
    PersonUpdateSuccess,
)
from backend.api_v1.sex.sex_model import SEX_ID_BY_NAME
from backend.api_v1.marital_status.marital_status_model import (
    MARITAL_STATUS_ID_BY_NAME,
)
from backend.utils.person_names import normalize_name_part, build_employee_name


class PersonService(BaseService):
    def __init__(
        self,
        repository: PersonRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    # ------------------------------------------------------------------
    # Serialization helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _employee_slim(employee) -> PersonEmployeeSlim:
        main_link = employee.departments[0] if employee.departments else None
        return PersonEmployeeSlim(
            id=employee.id,
            code=employee.code,
            name=employee.name,
            job_name=employee.job.name if employee.job else None,
            department_name=(
                main_link.department.name
                if main_link and main_link.department
                else None
            ),
        )

    def _to_schema(self, person: Person) -> PersonSchema:
        schema = PersonSchema.model_validate(person)
        schema.employees = [self._employee_slim(e) for e in person.employees]
        return schema

    # ------------------------------------------------------------------
    # Reads
    # ------------------------------------------------------------------

    async def get_by_id(self, id: int) -> Person:
        result = await self.repository.get_by_id(id)
        if not result:
            raise await self._resolve_domain_error(PersonNotFound(id))
        return result

    async def get_person(self, person_id: int) -> PersonSchema:
        return self._to_schema(await self.get_by_id(person_id))

    async def get_persons(self, sort: Optional[str] = None) -> List[PersonSchema]:
        records = await self.get_all(sort_json=sort)
        return [self._to_schema(r) for r in records]

    async def get_by_employee_id(self, employee_id: int) -> PersonSchema:
        person = await self.repository.get_by_employee_id(employee_id)
        if not person:
            raise await self._resolve_domain_error(
                PersonNotFoundForEmployee(employee_id)
            )
        return self._to_schema(person)

    async def get_by_employee_code(self, code: str) -> PersonSchema:
        person = await self.repository.get_by_employee_code(code)
        if not person:
            raise await self._resolve_domain_error(PersonNotFoundForEmployee(code))
        return self._to_schema(person)

    async def check_name(
        self, first_name: str, last_name: str
    ) -> PersonCheckNameResponse:
        first = normalize_name_part(first_name)
        last = normalize_name_part(last_name)
        if not first or not last:
            return PersonCheckNameResponse(matches=[])
        matches = await self.repository.find_by_normalized_name(first, last)
        return PersonCheckNameResponse(
            matches=[
                PersonNameMatch(
                    person_id=p.id,
                    first_name=p.first_name,
                    last_name=p.last_name,
                    patronymic=p.patronymic,
                    name_dedupe_no=p.name_dedupe_no,
                    employees=[self._employee_slim(e) for e in p.employees],
                )
                for p in matches
            ]
        )

    # ------------------------------------------------------------------
    # Writes
    # ------------------------------------------------------------------

    async def create_person(
        self, person_in: PersonCreate
    ) -> MutationResponse[PersonSchema]:
        first = normalize_name_part(person_in.first_name)
        last = normalize_name_part(person_in.last_name)
        patronymic = normalize_name_part(person_in.patronymic)

        existing = await self.repository.find_by_normalized_name(first, last)
        if existing and not person_in.allow_duplicate:
            raise await self._resolve_domain_error(PersonNameExists(last, first))

        fields = {
            "first_name": first,
            "last_name": last,
            "patronymic": patronymic,
            "sex_id": SEX_ID_BY_NAME.get(person_in.sex) if person_in.sex else None,
            "marital_status_id": (
                MARITAL_STATUS_ID_BY_NAME.get(person_in.marital_status)
                if person_in.marital_status
                else None
            ),
            "birth_date": person_in.birth_date,
        }
        record = await self._create_with_dedupe(fields)
        schema = self._to_schema(record)
        detail = await self._resolve_domain_success(
            PersonCreateSuccess(f"{last} {first}")
        )
        return MutationResponse(detail=detail, data=schema)

    async def _create_with_dedupe(self, fields: dict) -> Person:
        """Insert with the next dedupe number; the unique constraint is the
        race backstop — on collision retry once with a fresh number."""
        for attempt in (0, 1):
            fields["name_dedupe_no"] = await self.repository.get_next_dedupe_no(
                fields["first_name"], fields["last_name"]
            )
            try:
                return await self.repository.create(Person(**fields))
            except IntegrityError:
                await self.session.rollback()
                if attempt == 1:
                    raise await self._resolve_domain_error(
                        PersonNameExists(fields["last_name"], fields["first_name"])
                    )

    async def update_person(
        self, person_id: int, person_update: PersonUpdate
    ) -> MutationResponse[PersonSchema]:
        person = await self.get_by_id(person_id)
        fields = person_update.model_dump(exclude_unset=True)
        fields.pop("allow_duplicate", None)
        # API exchanges sex / marital status as strings; the DB stores lookup ids.
        if "sex" in fields:
            sex_name = fields.pop("sex")
            fields["sex_id"] = SEX_ID_BY_NAME.get(sex_name) if sex_name else None
        if "marital_status" in fields:
            marital_name = fields.pop("marital_status")
            fields["marital_status_id"] = (
                MARITAL_STATUS_ID_BY_NAME.get(marital_name) if marital_name else None
            )

        for key in ("first_name", "last_name", "patronymic"):
            if key in fields:
                fields[key] = normalize_name_part(fields[key])

        new_first = fields.get("first_name", person.first_name)
        new_last = fields.get("last_name", person.last_name)
        name_changed = (new_first, new_last) != (person.first_name, person.last_name)

        if name_changed:
            others = [
                p
                for p in await self.repository.find_by_normalized_name(
                    new_first, new_last
                )
                if p.id != person_id
            ]
            if others and not person_update.allow_duplicate:
                raise await self._resolve_domain_error(
                    PersonNameExists(new_last, new_first)
                )
            fields["name_dedupe_no"] = await self.repository.get_next_dedupe_no(
                new_first, new_last
            )

        try:
            updated = await self.repository.update(person, fields)
        except IntegrityError:
            await self.session.rollback()
            raise await self._resolve_domain_error(
                PersonNameExists(new_last, new_first)
            )

        if name_changed:
            await self._sync_employee_names(updated)

        schema = self._to_schema(updated)
        detail = await self._resolve_domain_success(
            PersonUpdateSuccess(f"{updated.last_name} {updated.first_name}")
        )
        return MutationResponse(detail=detail, data=schema)

    async def _sync_employee_names(self, person: Person) -> None:
        """Rebuild the derived employees.name for every linked employee."""
        if not person.first_name or not person.last_name:
            return
        derived = build_employee_name(person.last_name, person.first_name)
        changed = False
        for employee in person.employees:
            if employee.name != derived:
                employee.name = derived
                changed = True
        if changed:
            await self.session.commit()

    async def set_sex(self, person_id: int, sex: Optional[str]) -> Person:
        """Targeted sex update ('male'/'female' -> sex_id) used by
        EmployeeService.set_personal_data."""
        person = await self.get_by_id(person_id)
        sex_id = SEX_ID_BY_NAME.get(sex) if sex else None
        return await self.repository.update(person, {"sex_id": sex_id})

    async def delete_person(self, person_id: int) -> None:
        person = await self.get_by_id(person_id)
        display = f"{person.last_name or ''} {person.first_name or ''}".strip()
        if person.employees:
            raise await self._resolve_domain_error(PersonHasEmployees(display))
        await self.delete_by_id(
            person_id,
            name=display,
            delete_success_exc=PersonDeleteSuccess,
        )
