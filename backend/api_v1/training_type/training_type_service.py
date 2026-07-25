
from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee.employee_messages import EmployeeNotFound
from backend.api_v1.employee.employee_repository import EmployeeRepository
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.talent_audit.talent_audit_repository import TalentAuditRepository
from backend.api_v1.training_type.training_type_messages import (
    TrainingTypeCreateSuccess,
    TrainingTypeDeleteError,
    TrainingTypeDeleteSuccess,
    TrainingTypeKeyTaken,
    TrainingTypeNameTaken,
    TrainingTypeNotFound,
    TrainingTypeUpdateSuccess,
)
from backend.api_v1.training_type.training_type_repository import TrainingTypeRepository
from backend.api_v1.training_type.training_type_schema import (
    TrainingType as TrainingTypeSchema,
)
from backend.api_v1.training_type.training_type_schema import (
    TrainingTypeCreate,
    TrainingTypeUpdate,
)
from backend.api_v1.training_type_job_category_link.training_type_job_category_link_repository import (
    TrainingTypeJobCategoryLinkRepository,
)
from backend.api_v1.training_type_job_link.training_type_job_link_repository import (
    TrainingTypeJobLinkRepository,
)
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

# Seeded, code-referenced keys — see training_link_type seed script.
BY_JOB_CATEGORY_KEY = "by_job_category"
BY_JOB_KEY = "by_job"
EVERYONE_KEY = "everyone"


def _to_enriched_schema(record) -> TrainingTypeSchema:
    schema = TrainingTypeSchema.model_validate(record)
    schema.training_category_name = (
        record.training_category.name if record.training_category else None
    )
    schema.training_link_type_key = (
        record.training_link_type.key if record.training_link_type else None
    )
    schema.job_category_ids = [lnk.job_category_id for lnk in record.job_category_links]
    schema.job_category_keys = [
        lnk.job_category.key for lnk in record.job_category_links if lnk.job_category
    ]
    schema.job_ids = [lnk.job_id for lnk in record.job_links]
    schema.job_names = [lnk.job.name for lnk in record.job_links if lnk.job]
    return schema


class TrainingTypeService(BaseService):
    def __init__(
        self,
        repository: TrainingTypeRepository,
        user: EmployeeSchema | None = None,
        session: AsyncSession | None = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def get_by_id(self, id: int) -> TrainingTypeSchema:
        result = await self.repository.get_by_id(id)
        if not result:
            raise await self._resolve_domain_error(TrainingTypeNotFound(id))
        return result

    async def get_training_types(self) -> list[TrainingTypeSchema]:
        records = await self.get_all(sort=["name"])
        return [_to_enriched_schema(r) for r in records]

    async def get_eligible_for_employee(self, employee_id: int) -> list[TrainingTypeSchema]:
        """
        Filter view only — never a write constraint (see employee_training,
        which accepts any training_type_id). A training type is eligible when:
          - link type "everyone": always
          - link type "by_job_category": employee's current job's category is
            one of the training type's linked job categories
          - link type "by_job": one of the training type's linked jobs matches
            either the employee's current job, OR one of the employee's talent
            target jobs
        """
        employee_repo = EmployeeRepository(session=self.session)
        employee = await employee_repo.get_by_id(employee_id)
        if not employee:
            raise await self._resolve_domain_error(EmployeeNotFound(employee_id))

        employee_job_id = employee.job_id
        employee_job_category_id = (
            employee.job.job_category_id if employee.job else None
        )

        talent_audit_repo = TalentAuditRepository(session=self.session)
        talent_audit = await talent_audit_repo.get_by_employee_id(employee_id)
        talent_target_job_ids = (
            {j.target_job_id for j in talent_audit.jobs} if talent_audit else set()
        )

        all_types = await self.repository.get_all()
        eligible = []
        for training_type in all_types:
            link_key = (
                training_type.training_link_type.key
                if training_type.training_link_type
                else None
            )
            if link_key == EVERYONE_KEY:
                eligible.append(training_type)
            elif link_key == BY_JOB_CATEGORY_KEY:
                linked_category_ids = {
                    lnk.job_category_id for lnk in training_type.job_category_links
                }
                if (
                    employee_job_category_id is not None
                    and employee_job_category_id in linked_category_ids
                ):
                    eligible.append(training_type)
            elif link_key == BY_JOB_KEY:
                linked_job_ids = {lnk.job_id for lnk in training_type.job_links}
                if linked_job_ids and (
                    employee_job_id in linked_job_ids
                    or linked_job_ids & talent_target_job_ids
                ):
                    eligible.append(training_type)

        return [_to_enriched_schema(r) for r in eligible]

    async def _check_unique(
        self, name: str | None, key: str | None, exclude_id: int | None = None
    ) -> None:
        if name:
            existing = await self.repository.get_by_field("name", name)
            if existing and existing.id != exclude_id:
                raise await self._resolve_domain_error(TrainingTypeNameTaken(name))
        if key:
            existing = await self.repository.get_by_field("key", key)
            if existing and existing.id != exclude_id:
                raise await self._resolve_domain_error(TrainingTypeKeyTaken(key))

    async def _set_links(
        self, training_type_id: int, job_category_ids: list[int], job_ids: list[int]
    ) -> None:
        job_category_link_repo = TrainingTypeJobCategoryLinkRepository(
            session=self.session
        )
        await job_category_link_repo.delete_links_for_training_type(training_type_id)
        if job_category_ids:
            await job_category_link_repo.mass_create(
                [
                    job_category_link_repo.model(
                        training_type_id=training_type_id, job_category_id=cid
                    )
                    for cid in job_category_ids
                ]
            )

        job_link_repo = TrainingTypeJobLinkRepository(session=self.session)
        await job_link_repo.delete_links_for_training_type(training_type_id)
        if job_ids:
            await job_link_repo.mass_create(
                [
                    job_link_repo.model(training_type_id=training_type_id, job_id=jid)
                    for jid in job_ids
                ]
            )

    async def create_training_type(
        self, data: TrainingTypeCreate
    ) -> MutationResponse[TrainingTypeSchema]:
        await self._check_unique(data.name, data.key)
        try:
            core_fields = data.model_dump(exclude={"job_category_ids", "job_ids"})
            record = await self.create_from_dict(core_fields)
            record_id = record.id
            await self._set_links(record_id, data.job_category_ids, data.job_ids)
            self.session.expire(record)
            record = await self.repository.get_by_id(record_id)
            schema = _to_enriched_schema(record)
            detail = await self._resolve_domain_success(
                TrainingTypeCreateSuccess(schema.name)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(TrainingTypeKeyTaken(data.key))

    async def update_training_type(
        self, record_id: int, data: TrainingTypeUpdate
    ) -> MutationResponse[TrainingTypeSchema]:
        await self._check_unique(data.name, data.key, exclude_id=record_id)
        try:
            orm_record = await self.get_by_id(record_id)
            core_fields = data.model_dump(
                exclude_unset=True, exclude={"job_category_ids", "job_ids"}
            )
            updated = await self.repository.update(
                instance=orm_record, instance_update=core_fields
            )
            if data.job_category_ids is not None or data.job_ids is not None:
                current_category_ids = (
                    data.job_category_ids
                    if data.job_category_ids is not None
                    else [lnk.job_category_id for lnk in orm_record.job_category_links]
                )
                current_job_ids = (
                    data.job_ids
                    if data.job_ids is not None
                    else [lnk.job_id for lnk in orm_record.job_links]
                )
                await self._set_links(record_id, current_category_ids, current_job_ids)
            self.session.expire(updated)
            updated = await self.repository.get_by_id(record_id)
            schema = _to_enriched_schema(updated)
            detail = await self._resolve_domain_success(
                TrainingTypeUpdateSuccess(schema.name)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(TrainingTypeKeyTaken(data.key))

    async def delete_training_type(self, record_id: int) -> None:
        record = await self.get_by_id(record_id)
        await self.delete_by_id(
            record_id,
            name=record.name,
            delete_error_exc=TrainingTypeDeleteError,
            delete_success_exc=TrainingTypeDeleteSuccess,
        )
