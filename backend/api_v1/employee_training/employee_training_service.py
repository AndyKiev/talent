from typing import Optional, List

from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.employee_training.employee_training_repository import (
    EmployeeTrainingRepository,
)
from backend.api_v1.employee_training.employee_training_schema import (
    EmployeeTraining as EmployeeTrainingSchema,
    EmployeeTrainingCreate,
    EmployeeTrainingUpdate,
    TrainingStateRow,
)
from backend.api_v1.employee.employee_repository import EmployeeRepository
from backend.api_v1.department.department_repository import DepartmentRepository
from backend.api_v1.department.department_org_units import resolve_top_org_unit
from backend.api_v1.training_type.training_type_repository import (
    TrainingTypeRepository,
)
from backend.api_v1.training_type.training_type_errors import TrainingTypeNotFound
from backend.api_v1.employee_training.employee_training_errors import (
    EmployeeTrainingNotFound,
    EmployeeTrainingAlreadyAssigned,
    EmployeeTrainingDeleteError,
)
from backend.api_v1.employee_training.employee_training_success import (
    EmployeeTrainingCreateSuccess,
    EmployeeTrainingUpdateSuccess,
    EmployeeTrainingDeleteSuccess,
)


# Link-type keys (mirror TrainingTypeService) + the synthetic state for an
# eligible employee who has no assignment row yet.
EVERYONE_KEY = "everyone"
BY_JOB_CATEGORY_KEY = "by_job_category"
BY_JOB_KEY = "by_job"
NOT_PLANNED_KEY = "not_planned"


def _to_enriched_schema(record) -> EmployeeTrainingSchema:
    schema = EmployeeTrainingSchema.model_validate(record)
    schema.training_type_name = (
        record.training_type.name if record.training_type else None
    )
    schema.training_status_key = (
        record.training_status.key if record.training_status else None
    )
    return schema


class EmployeeTrainingService(BaseService):
    def __init__(
        self,
        repository: EmployeeTrainingRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def get_by_id(self, id: int) -> EmployeeTrainingSchema:
        result = await self.repository.get_by_id(id)
        if not result:
            raise await self._resolve_domain_error(EmployeeTrainingNotFound(id))
        return result

    async def get_for_employee(self, employee_id: int) -> List[EmployeeTrainingSchema]:
        records = await self.repository.get_for_employee(employee_id)
        return [_to_enriched_schema(r) for r in records]

    async def get_training_state(
        self, training_type_id: int
    ) -> List[TrainingStateRow]:
        """
        Read-only report: every active employee "supposed to pass" the given
        training type, plus their current status (or synthetic ``not_planned``).

        Who is "supposed to pass" (reverse of TrainingTypeService.get_eligible_
        for_employee, but CURRENT obligation only — talent-target jobs are NOT
        counted here):
          - link type ``everyone``          -> every active employee
          - link type ``by_job_category``   -> current job's category is linked
          - link type ``by_job``            -> current job is linked
        Any employee who already has an assignment row is ALWAYS included with
        their real status, regardless of the rule above.
        """
        training_type = await TrainingTypeRepository(
            session=self.session
        ).get_by_id(training_type_id)
        if not training_type:
            raise await self._resolve_domain_error(
                TrainingTypeNotFound(training_type_id)
            )

        link_key = (
            training_type.training_link_type.key
            if training_type.training_link_type
            else None
        )
        linked_category_ids = {
            lnk.job_category_id for lnk in training_type.job_category_links
        }
        linked_job_ids = {lnk.job_id for lnk in training_type.job_links}

        employees = await EmployeeRepository(session=self.session).get_all()
        existing = await self.repository.get_for_training_type(training_type_id)
        status_by_employee = {
            r.employee_id: (
                r.training_status.key if r.training_status else NOT_PLANNED_KEY
            )
            for r in existing
        }

        org_index = await DepartmentRepository(
            session=self.session
        ).get_org_unit_index()
        # category key -> sort_order, to order main departments (top units) by
        # their category (store before directorate, etc.) in the filter.
        cat_sort_by_key = {
            r[0]: r[1]
            for r in (
                await self.session.execute(
                    text("select key, sort_order from department_categories")
                )
            ).all()
        }

        def is_supposed(emp) -> bool:
            if link_key == EVERYONE_KEY:
                return True
            if link_key == BY_JOB_CATEGORY_KEY:
                return emp.job is not None and emp.job.job_category_id in linked_category_ids
            if link_key == BY_JOB_KEY:
                return emp.job_id is not None and emp.job_id in linked_job_ids
            return False

        rows: List[TrainingStateRow] = []
        for emp in employees:
            if not emp.is_active:
                continue
            if not (is_supposed(emp) or emp.id in status_by_employee):
                continue

            main_link = emp.departments[0] if emp.departments else None
            dept = main_link.department if main_link else None
            category = dept.department_category if dept else None
            dtype = dept.department_type if dept else None
            top = (
                resolve_top_org_unit(main_link.department_id, org_index)
                if main_link
                else None
            )
            top_cat_sort = (
                cat_sort_by_key.get(org_index[top.id][2], 0)
                if top and top.id in org_index
                else 0
            )

            rows.append(
                TrainingStateRow(
                    employee_id=emp.id,
                    employee_name=emp.name,
                    employee_code=emp.code,
                    main_department_id=top.id if top else None,
                    main_department_name=top.name if top else None,
                    main_department_category_sort_order=top_cat_sort,
                    direct_department_name=dept.name if dept else None,
                    job_name=emp.job.name if emp.job else None,
                    department_category_key=category.key if category else None,
                    department_category_name=category.name if category else None,
                    department_category_sort_order=(
                        category.sort_order if category else 0
                    ),
                    department_type_name=dtype.name if dtype else None,
                    status_key=status_by_employee.get(emp.id, NOT_PLANNED_KEY),
                )
            )

        rows.sort(
            key=lambda r: (
                r.department_category_sort_order,
                r.department_type_name or "",
                r.employee_name,
            )
        )
        return rows

    async def create_employee_training(
        self, data: EmployeeTrainingCreate
    ) -> MutationResponse[EmployeeTrainingSchema]:
        existing_for_employee = await self.repository.get_for_employee(data.employee_id)
        if any(e.training_type_id == data.training_type_id for e in existing_for_employee):
            raise await self._resolve_domain_error(
                EmployeeTrainingAlreadyAssigned(data.employee_id, data.training_type_id)
            )
        try:
            record = await self.create(data)
            record = await self.repository.get_by_id(record.id)
            schema = _to_enriched_schema(record)
            detail = await self._resolve_domain_success(
                EmployeeTrainingCreateSuccess(schema.training_type_name or "")
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                EmployeeTrainingAlreadyAssigned(data.employee_id, data.training_type_id)
            )

    async def update_employee_training(
        self, record_id: int, data: EmployeeTrainingUpdate
    ) -> MutationResponse[EmployeeTrainingSchema]:
        orm_record = await self.get_by_id(record_id)
        updated = await self.update(orm_record, data, partial=True)
        updated = await self.repository.get_by_id(updated.id)
        schema = _to_enriched_schema(updated)
        detail = await self._resolve_domain_success(
            EmployeeTrainingUpdateSuccess(schema.training_type_name or "")
        )
        return MutationResponse(detail=detail, data=schema)

    async def delete_employee_training(self, record_id: int) -> None:
        record = await self.get_by_id(record_id)
        name = record.training_type.name if record.training_type else str(record_id)
        await self.delete_by_id(
            record_id,
            name=name,
            delete_error_exc=EmployeeTrainingDeleteError,
            delete_success_exc=EmployeeTrainingDeleteSuccess,
        )
