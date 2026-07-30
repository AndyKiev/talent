from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.recruitment_application.recruitment_application_model import (
    RecruitmentApplication,
)
from backend.api_v1.department.department_org_units import (
    DepartmentIndex,
    resolve_top_org_unit,
)
from backend.api_v1.department.department_repository import DepartmentRepository
from backend.api_v1.employee.employee_minis import fetch_employee_minis
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.job.job_model import Job
from backend.api_v1.job_requirement_group.job_requirement_group_messages import (
    JobRequirementGroupNotFound,
    JobRequirementGroupWrongJob,
)
from backend.api_v1.job_requirement_group.job_requirement_group_model import (
    JobRequirementGroup,
)
from backend.api_v1.job_requirement_group.job_requirement_group_repository import (
    JobRequirementGroupRepository,
)
from backend.api_v1.recruitment_application_status.recruitment_application_status_model import (
    RecruitmentApplicationStatus,
)
from backend.api_v1.recruitment_task.recruitment_task_messages import (
    RecruitmentTaskClosed,
    RecruitmentTaskCreateSuccess,
    RecruitmentTaskDeleteError,
    RecruitmentTaskDeleteSuccess,
    RecruitmentTaskFulfillNeedsCandidate,
    RecruitmentTaskInvalidTransition,
    RecruitmentTaskNotFound,
    RecruitmentTaskRequirementGroupRequired,
    RecruitmentTaskStatusChangeSuccess,
    RecruitmentTaskUpdateSuccess,
)
from backend.api_v1.recruitment_task.recruitment_task_repository import (
    RecruitmentTaskRepository,
)
from backend.api_v1.recruitment_task.recruitment_task_schema import (
    RecruitmentTaskCreate,
    RecruitmentTaskCreatorMini,
    RecruitmentTaskDepartmentMini,
    RecruitmentTaskGroupMini,
    RecruitmentTaskJobMini,
    RecruitmentTaskSchema,
    RecruitmentTaskUpdate,
)
from backend.api_v1.recruitment_task.recruitment_task_state_machine import (
    CLOSED_STATUS_KEYS,
    RecruitmentTaskStatusKey,
    can_transition,
)
from backend.api_v1.recruitment_task_status.recruitment_task_status_repository import (
    RecruitmentTaskStatusRepository,
)


class RecruitmentTaskService(BaseService):
    def __init__(
        self,
        repository: RecruitmentTaskRepository,
        user: EmployeeSchema | None = None,
        session: AsyncSession | None = None,
    ):
        super().__init__(repository, user=user, session=session)
        # Sibling repos share the same session so everything commits atomically.
        self.group_repository = JobRequirementGroupRepository(session=session)
        self.status_repository = RecruitmentTaskStatusRepository(session=session)

    async def get_by_id(self, id: int):
        result = await self.repository.get_by_id(id)
        if not result:
            raise await self._resolve_domain_error(RecruitmentTaskNotFound(id))
        return result

    async def _status_by_name(self, name: str):
        return await self.status_repository.get_by_field("name", name)

    async def _has_hired_candidate(self, task_id: int) -> bool:
        """True if at least one application for this task reached the 'hired' stage."""
        stmt = (
            select(func.count())
            .select_from(RecruitmentApplication)
            .join(
                RecruitmentApplicationStatus,
                RecruitmentApplicationStatus.id == RecruitmentApplication.status_id,
            )
            .where(
                RecruitmentApplication.recruitment_task_id == task_id,
                RecruitmentApplicationStatus.name == "hired",
            )
        )
        count = (await self.repository.session.execute(stmt)).scalar_one()
        return count > 0

    async def _org_index(self) -> DepartmentIndex:
        # Flat department index (id -> (parent_id, name, category_key)); built once
        # per request so list endpoints don't rebuild it per task. Uses the repo
        # session (always present).
        dept_repo = DepartmentRepository(session=self.repository.session)
        return await dept_repo.get_org_unit_index()

    async def _enrich_many(
        self, schemas: list[RecruitmentTaskSchema]
    ) -> list[RecruitmentTaskSchema]:
        """Fill the display minis (creator / department / top_org_unit /
        requirement_group) via cheap batched COLUMN queries — the corresponding
        model relationships are lazy="noload" to avoid dragging heavy graphs."""
        if not schemas:
            return schemas
        session = self.repository.session
        index = await self._org_index()
        emp_minis = await fetch_employee_minis(session, (s.created_by for s in schemas))
        job_rows = (
            await session.execute(
                select(Job.id, Job.name, Job.is_active).where(
                    Job.id.in_({s.job_id for s in schemas})
                )
            )
        ).all()
        job_minis = {
            r[0]: RecruitmentTaskJobMini(id=r[0], name=r[1], is_active=r[2])
            for r in job_rows
        }
        group_ids = {
            s.job_requirement_group_id
            for s in schemas
            if s.job_requirement_group_id is not None
        }
        group_minis: dict[int, RecruitmentTaskGroupMini] = {}
        if group_ids:
            rows = (
                await session.execute(
                    select(
                        JobRequirementGroup.id,
                        JobRequirementGroup.name,
                        JobRequirementGroup.is_active,
                    ).where(JobRequirementGroup.id.in_(group_ids))
                )
            ).all()
            group_minis = {
                r[0]: RecruitmentTaskGroupMini(id=r[0], name=r[1], is_active=r[2])
                for r in rows
            }
        for s in schemas:
            s.job = job_minis.get(s.job_id)
            if s.department_id is not None:
                s.top_org_unit = resolve_top_org_unit(s.department_id, index)
                entry = index.get(s.department_id)
                if entry:
                    s.department = RecruitmentTaskDepartmentMini(
                        id=s.department_id, name=entry[1]
                    )
            mini = emp_minis.get(s.created_by)
            if mini:
                s.creator = RecruitmentTaskCreatorMini(**mini)
            if s.job_requirement_group_id is not None:
                s.requirement_group = group_minis.get(s.job_requirement_group_id)
        return schemas

    async def _enrich(self, schema: RecruitmentTaskSchema) -> RecruitmentTaskSchema:
        await self._enrich_many([schema])
        return schema

    async def get_recruitment_task_detail(self, task_id: int) -> RecruitmentTaskSchema:
        """Single task as a fully enriched schema (GET by id)."""
        record = await self.get_by_id(task_id)
        return await self._enrich(RecruitmentTaskSchema.model_validate(record))

    async def _validate_group_for_job(self, group_id: int, job_id: int) -> None:
        group = await self.group_repository.get_by_id(group_id)
        if not group:
            raise await self._resolve_domain_error(
                JobRequirementGroupNotFound(group_id)
            )
        if group.job_id != job_id:
            raise await self._resolve_domain_error(
                JobRequirementGroupWrongJob(group_id)
            )

    async def get_recruitment_tasks(
        self,
        status_id: int | None = None,
        job_id: int | None = None,
        sort: str | None = None,
    ) -> list[RecruitmentTaskSchema]:
        filters = {}
        if status_id is not None:
            filters["status_id"] = status_id
        if job_id is not None:
            filters["job_id"] = job_id
        records = await self.get_all(
            params=filters or None,
            sort_json=sort,
            sort=None if sort else [{"created_at": "desc"}, {"id": "desc"}],
        )
        return await self._enrich_many(
            [RecruitmentTaskSchema.model_validate(r) for r in records]
        )

    async def create_recruitment_task(
        self, task_in: RecruitmentTaskCreate
    ) -> MutationResponse[RecruitmentTaskSchema]:
        # Job is pickable regardless of is_active — no active-state check here.
        if task_in.job_requirement_group_id is not None:
            await self._validate_group_for_job(
                task_in.job_requirement_group_id, task_in.job_id
            )
        created_status = await self._status_by_name(
            RecruitmentTaskStatusKey.CREATED.value
        )
        record = self.repository.model(
            **task_in.model_dump(),
            status_id=created_status.id,
            created_by=self.user.id,
        )
        record = await self.repository.create(instance=record)
        record = await self.get_by_id(record.id)
        schema = await self._enrich(RecruitmentTaskSchema.model_validate(record))
        job_name = schema.job.name if schema.job else str(schema.job_id)
        detail = await self._resolve_domain_success(
            RecruitmentTaskCreateSuccess(job_name)
        )
        return MutationResponse(detail=detail, data=schema)

    async def update_recruitment_task(
        self, task_id: int, task_update: RecruitmentTaskUpdate
    ) -> MutationResponse[RecruitmentTaskSchema]:
        orm_record = await self.get_by_id(task_id)
        current_key = RecruitmentTaskStatusKey(orm_record.status.name)
        if current_key in CLOSED_STATUS_KEYS:
            raise await self._resolve_domain_error(RecruitmentTaskClosed(task_id))
        if (
            task_update.job_requirement_group_id is not None
            and task_update.job_requirement_group_id
            != orm_record.job_requirement_group_id
        ):
            await self._validate_group_for_job(
                task_update.job_requirement_group_id, orm_record.job_id
            )
        updated = await self.update(orm_record, task_update, partial=True)
        # Detach the cached instance so the re-fetch builds a fresh one with
        # selectin relationships reloaded (e.g. the newly linked
        # requirement_group) — the session keeps instances live across commit,
        # so a plain re-fetch would return the stale cached relationship.
        self.session.expunge(updated)
        updated = await self.get_by_id(updated.id)
        schema = await self._enrich(RecruitmentTaskSchema.model_validate(updated))
        detail = await self._resolve_domain_success(
            RecruitmentTaskUpdateSuccess(str(task_id))
        )
        return MutationResponse(detail=detail, data=schema)

    async def change_status(
        self, task_id: int, target_key: RecruitmentTaskStatusKey
    ) -> MutationResponse[RecruitmentTaskSchema]:
        orm_record = await self.get_by_id(task_id)
        current_key = RecruitmentTaskStatusKey(orm_record.status.name)
        if not can_transition(current_key, target_key):
            raise await self._resolve_domain_error(
                RecruitmentTaskInvalidTransition(current_key.value, target_key.value)
            )
        # Cannot start work without a requirement group linked.
        if (
            target_key == RecruitmentTaskStatusKey.IN_PROCESS
            and orm_record.job_requirement_group_id is None
        ):
            raise await self._resolve_domain_error(
                RecruitmentTaskRequirementGroupRequired()
            )
        # A task can only be marked fulfilled once a candidate has been hired for
        # it — "fulfilled" means the position was filled.
        if target_key == RecruitmentTaskStatusKey.FULFILLED and not (
            await self._has_hired_candidate(task_id)
        ):
            raise await self._resolve_domain_error(
                RecruitmentTaskFulfillNeedsCandidate()
            )
        target_status = await self._status_by_name(target_key.value)
        # Assign the relationship (not just the FK) so the returned schema's
        # nested status is correct even though the session keeps instances live
        # across commit (expire_on_commit=False).
        orm_record.status = target_status
        now = datetime.now(UTC)
        # Stamp / clear the transition timestamps — transitions are reversible, so
        # reopening a closed task clears closed_at, and reverting to created clears
        # both stamps.
        if target_key == RecruitmentTaskStatusKey.CREATED:
            orm_record.in_process_at = None
            orm_record.closed_at = None
        elif target_key == RecruitmentTaskStatusKey.IN_PROCESS:
            orm_record.in_process_at = orm_record.in_process_at or now
            orm_record.closed_at = None
        elif target_key in CLOSED_STATUS_KEYS:
            orm_record.closed_at = now
        await self.session.commit()
        refreshed = await self.get_by_id(task_id)
        schema = await self._enrich(RecruitmentTaskSchema.model_validate(refreshed))
        detail = await self._resolve_domain_success(
            RecruitmentTaskStatusChangeSuccess(target_key.value)
        )
        return MutationResponse(detail=detail, data=schema)

    async def delete_recruitment_task(self, task_id: int) -> None:
        orm_record = await self.get_by_id(task_id)
        current_key = RecruitmentTaskStatusKey(orm_record.status.name)
        if current_key != RecruitmentTaskStatusKey.CREATED:
            raise await self._resolve_domain_error(
                RecruitmentTaskDeleteError(str(task_id))
            )
        await self.delete_by_id(
            task_id,
            name=str(task_id),
            delete_error_exc=RecruitmentTaskDeleteError,
            delete_success_exc=RecruitmentTaskDeleteSuccess,
        )
