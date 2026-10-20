from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee.employee_minis import compose_row_name
from backend.api_v1.employee.employee_repository import EmployeeRepository
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.talent_audit.talent_audit_messages import (
    TalentAuditAlreadyExists,
    TalentAuditCreateSuccess,
    TalentAuditDeleteError,
    TalentAuditDeleteSuccess,
    TalentAuditNotFound,
    TalentAuditTalentPlusDisableSuccess,
    TalentAuditTalentPlusEnableSuccess,
    TalentAuditUpdateSuccess,
)
from backend.api_v1.talent_audit.talent_audit_repository import TalentAuditRepository
from backend.api_v1.talent_audit.talent_audit_schema import (
    TalentAudit as TalentAuditSchema,
)
from backend.api_v1.talent_audit.talent_audit_schema import (
    TalentAuditCreate,
    TalentAuditUpdate,
    TalentRosterDepartmentOption,
    TalentRosterEmployeeOption,
    TalentRosterOption,
    TalentRosterOptions,
    TalentRosterPage,
    TalentRosterRow,
    TalentRosterTalent,
)

# Roster sort keys → value getter on a TalentRosterRow. Names are encrypted at
# rest, so every sort happens in Python after decryption.
_NO_TALENT_LAST = 10**6
_ROSTER_SORT_KEYS = {
    "name": lambda r: r.name.lower(),
    "code": lambda r: r.code,
    "main_department_name": lambda r: (r.main_department_name or "").lower(),
    "job_name": lambda r: (r.job_name or "").lower(),
    "status_name": lambda r: r.status_name or "",
    "main_talent_job": lambda r: r.talents[0].job_name.lower() if r.talents else "",
    "main_talent_period": lambda r: (
        r.talents[0].qty_months if r.talents else _NO_TALENT_LAST
    ),
}


class TalentAuditService(BaseService):
    def __init__(
        self,
        repository: TalentAuditRepository,
        user: EmployeeSchema | None = None,
        session: AsyncSession | None = None,
    ):
        super().__init__(repository, user=user, session=session)

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    async def get_by_id(self, audit_id: int) -> TalentAuditSchema:
        record = await self.repository.get_by_id(audit_id)
        if not record:
            raise await self._resolve_domain_error(TalentAuditNotFound(audit_id))
        return record

    async def get_by_employee_id(self, employee_id: int) -> TalentAuditSchema:
        record = await self.repository.get_by_employee_id(employee_id)
        if not record:
            raise await self._resolve_domain_error(TalentAuditNotFound(employee_id))
        return TalentAuditSchema.model_validate(record)

    async def get_talent_audits(
        self, sort: str | None = None
    ) -> list[TalentAuditSchema]:
        records = await self.get_all(sort_json=sort)
        return [TalentAuditSchema.model_validate(r) for r in records]

    # ------------------------------------------------------------------
    # Talent employees roster (Employees → Talent employees)
    # ------------------------------------------------------------------

    async def _visible_department_ids(self, department_id: int | None):
        """Same visibility as the employees list (HRM scope ∩ chosen subtree)."""
        # Local import: employee_service imports half the app.
        from backend.api_v1.employee.employee_service import EmployeeService

        employee_service = EmployeeService(
            repository=EmployeeRepository(session=self.session),
            user=self.user,
            session=self.session,
        )
        return await employee_service.resolve_visible_main_department_ids(department_id)

    async def get_roster_options(
        self, department_id: int | None = None
    ) -> TalentRosterOptions:
        rows = await self.repository.get_roster_employees(
            await self._visible_department_ids(department_id)
        )
        employees, departments, jobs, statuses = [], {}, {}, {}
        for (
            emp_id, code, first, last, st_id, st_name,
            job_id, job_name, dept_id, dept_name, cat_sort,
        ) in rows:  # fmt: skip
            employees.append(
                TalentRosterEmployeeOption(
                    id=emp_id, code=code, name=compose_row_name(first, last)
                )
            )
            if dept_id is not None:
                departments[dept_id] = TalentRosterDepartmentOption(
                    id=dept_id, name=dept_name, category_sort_order=cat_sort or 0
                )
            if job_id is not None:
                jobs[job_id] = TalentRosterOption(id=job_id, name=job_name)
            if st_id is not None:
                statuses[st_id] = TalentRosterOption(id=st_id, name=st_name)
        return TalentRosterOptions(
            employees=sorted(employees, key=lambda e: e.name.lower()),
            departments=sorted(
                departments.values(),
                key=lambda d: (d.category_sort_order, d.name.lower()),
            ),
            jobs=sorted(jobs.values(), key=lambda j: j.name.lower()),
            statuses=sorted(statuses.values(), key=lambda s: s.name),
            talent_statuses=[
                TalentRosterOption(id=i, name=key)
                for i, key in await self.repository.get_active_talent_statuses()
            ],
            talent_periods=[
                TalentRosterOption(id=i, name=name)
                for i, name in await self.repository.get_active_talent_periods()
            ],
        )

    async def get_roster(
        self,
        *,
        page: int = 0,
        page_size: int = 25,
        department_id: int | None = None,
        subdepartment_id: int | None = None,
        job_id: int | None = None,
        status_id: int | None = None,
        employee_id: int | None = None,
        q: str | None = None,
        has_talent: bool | None = True,
        talent_status_id: int | None = None,
        talent_period_id: int | None = None,
        sort_field: str = "name",
        sort_desc: bool = False,
    ) -> TalentRosterPage:
        """
        One row per visible employee with ALL their talents (effective status /
        period = latest HRS interview result, else HRM), sorted closest period
        first so talents[0] is the main one. Structured filters run in SQL; the
        name search, talent filters and sorting run in Python (names are
        encrypted), then only the requested page is returned.
        """
        emp_rows = await self.repository.get_roster_employees(
            await self._visible_department_ids(department_id),
            subdepartment_id=subdepartment_id,
            job_id=job_id,
            status_id=status_id,
            employee_id=employee_id,
        )
        rows = [
            TalentRosterRow(
                employee_id=emp_id,
                code=code,
                name=compose_row_name(first, last),
                status_id=st_id,
                status_name=st_name,
                job_id=e_job_id,
                job_name=e_job_name,
                main_department_id=dept_id,
                main_department_name=dept_name,
            )
            for (
                emp_id, code, first, last, st_id, st_name,
                e_job_id, e_job_name, dept_id, dept_name, _cat_sort,
            ) in emp_rows  # fmt: skip
        ]

        needle = (q or "").strip().lower()
        if needle:
            rows = [r for r in rows if needle in f"{r.code} {r.name}".lower()]

        await self._attach_talents(rows)

        if has_talent is not None:
            rows = [r for r in rows if bool(r.talents) == has_talent]
        if talent_status_id is not None or talent_period_id is not None:
            rows = [
                r
                for r in rows
                if any(
                    (talent_status_id is None or t.talent_status_id == talent_status_id)
                    and (
                        talent_period_id is None
                        or t.talent_period_id == talent_period_id
                    )
                    for t in r.talents
                )
            ]

        sort_key = _ROSTER_SORT_KEYS.get(sort_field, _ROSTER_SORT_KEYS["name"])
        # employee_id last: a total order, so paging never repeats/skips a row.
        rows.sort(
            key=lambda r: (sort_key(r), r.name.lower(), r.employee_id),
            reverse=sort_desc,
        )

        start = max(page, 0) * page_size
        return TalentRosterPage(items=rows[start : start + page_size], total=len(rows))

    async def _attach_talents(self, rows: list[TalentRosterRow]) -> None:
        """Fill talent_audit_id / talent_plus / talents on the rows in place —
        three column queries in total, regardless of the row count."""
        by_employee = {r.employee_id: r for r in rows}
        row_by_audit: dict[int, TalentRosterRow] = {}
        for audit_id, emp_id, talent_plus in await self.repository.get_roster_audits(
            list(by_employee)
        ):
            row = by_employee[emp_id]
            row.talent_audit_id = audit_id
            row.talent_plus = talent_plus
            row_by_audit[audit_id] = row

        jobs = await self.repository.get_roster_audit_jobs(list(row_by_audit))
        latest_hrs: dict[int, tuple] = {}
        for result in await self.repository.get_roster_interview_results(
            [j[0] for j in jobs]
        ):
            latest_hrs.setdefault(result[0], result)  # rows come newest first

        for (
            aj_id, audit_id, target_job_id, job_name, js_id, js_key, js_name,
            ts_id, ts_key, tp_id, tp_name, qty,
        ) in jobs:  # fmt: skip
            talent = TalentRosterTalent(
                talent_audit_job_id=aj_id,
                target_job_id=target_job_id,
                job_name=job_name,
                job_status_id=js_id,
                job_status_key=js_key,
                job_status_name=js_name,
                talent_status_id=ts_id,
                talent_status_key=ts_key,
                talent_period_id=tp_id,
                talent_period_name=tp_name,
                qty_months=qty,
                is_hrs=False,
                hrm_label=f"{ts_key} - {tp_name}",
            )
            hrs = latest_hrs.get(aj_id)
            if hrs is not None:
                # HRS (interview) result overrides the HRM status / period.
                _, iv_id, iv_date, h_ts_id, h_ts_key, h_tp_id, h_tp_name, h_qty = hrs
                talent.is_hrs = True
                talent.interview_id = iv_id
                talent.interview_date = iv_date
                talent.hrs_label = f"{h_ts_key} - {h_tp_name}"
                talent.talent_status_id = h_ts_id
                talent.talent_status_key = h_ts_key
                talent.talent_period_id = h_tp_id
                talent.talent_period_name = h_tp_name
                talent.qty_months = h_qty
            row_by_audit[audit_id].talents.append(talent)

        for row in row_by_audit.values():
            row.talents.sort(key=lambda t: (t.qty_months, t.job_name.lower()))

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------

    async def create_talent_audit(
        self, audit_in: TalentAuditCreate
    ) -> MutationResponse[TalentAuditSchema]:
        existing = await self.repository.get_by_employee_id(audit_in.employee_id)
        if existing:
            raise await self._resolve_domain_error(
                TalentAuditAlreadyExists(audit_in.employee_id)
            )
        try:
            user_id = self.user.id if self.user else audit_in.employee_id
            instance = self.repository.model(
                **audit_in.model_dump(),
                created_by=user_id,
            )
            record = await self.repository.create(instance)
            schema = TalentAuditSchema.model_validate(record)
            detail = await self._resolve_domain_success(
                TalentAuditCreateSuccess(schema.employee_id)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                TalentAuditAlreadyExists(audit_in.employee_id)
            )

    async def update_talent_audit(
        self, audit_id: int, audit_update: TalentAuditUpdate
    ) -> MutationResponse[TalentAuditSchema]:
        orm_record = await self.get_by_id(audit_id)
        update_data = audit_update.model_dump(exclude_unset=True)
        updated = await self.repository.update(
            instance=orm_record,
            instance_update=update_data,
        )
        schema = TalentAuditSchema.model_validate(updated)
        detail = await self._resolve_domain_success(
            self._pick_update_success(schema.id, update_data)
        )
        return MutationResponse(detail=detail, data=schema)

    async def delete_talent_audit(self, audit_id: int) -> None:
        await self.get_by_id(audit_id)
        await self.delete_by_id(
            audit_id,
            name=str(audit_id),
            delete_error_exc=TalentAuditDeleteError,
            delete_success_exc=TalentAuditDeleteSuccess,
        )

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _pick_update_success(audit_id: int, update_data: dict):
        """
        Choose the success object for an update. A lone talent_plus toggle gets
        a dedicated enable/disable message; everything else uses the generic
        update message.
        """
        if set(update_data.keys()) == {"talent_plus"}:
            if update_data["talent_plus"]:
                return TalentAuditTalentPlusEnableSuccess(audit_id)
            return TalentAuditTalentPlusDisableSuccess(audit_id)
        return TalentAuditUpdateSuccess(audit_id)
