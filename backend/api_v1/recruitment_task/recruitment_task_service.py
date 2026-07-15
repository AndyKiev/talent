from datetime import datetime, timezone
from typing import Optional, List

from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.recruitment_task.recruitment_task_repository import (
    RecruitmentTaskRepository,
)
from backend.api_v1.recruitment_task.recruitment_task_schema import (
    RecruitmentTaskSchema,
    RecruitmentTaskCreate,
    RecruitmentTaskUpdate,
)
from backend.api_v1.recruitment_task.recruitment_task_state_machine import (
    RecruitmentTaskStatusKey,
    CLOSED_STATUS_KEYS,
    can_transition,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.job_requirement_group.job_requirement_group_repository import (
    JobRequirementGroupRepository,
)
from backend.api_v1.recruitment_task_status.recruitment_task_status_repository import (
    RecruitmentTaskStatusRepository,
)
from backend.api_v1.recruitment_task.recruitment_task_messages import (
    RecruitmentTaskNotFound,
    RecruitmentTaskInvalidTransition,
    RecruitmentTaskRequirementGroupRequired,
    RecruitmentTaskClosed,
    RecruitmentTaskDeleteError,
    RecruitmentTaskDeleteSuccess,
    RecruitmentTaskCreateSuccess,
    RecruitmentTaskUpdateSuccess,
    RecruitmentTaskStatusChangeSuccess,
)
from backend.api_v1.job_requirement_group.job_requirement_group_messages import (
    JobRequirementGroupNotFound,
    JobRequirementGroupWrongJob,
)


class RecruitmentTaskService(BaseService):
    def __init__(
        self,
        repository: RecruitmentTaskRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
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
        status_id: Optional[int] = None,
        job_id: Optional[int] = None,
        sort: Optional[str] = None,
    ) -> List[RecruitmentTaskSchema]:
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
        return [RecruitmentTaskSchema.model_validate(r) for r in records]

    async def create_recruitment_task(
        self, task_in: RecruitmentTaskCreate
    ) -> MutationResponse[RecruitmentTaskSchema]:
        # Job is pickable regardless of is_active — no active-state check here.
        if task_in.requirement_group_id is not None:
            await self._validate_group_for_job(
                task_in.requirement_group_id, task_in.job_id
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
        schema = RecruitmentTaskSchema.model_validate(record)
        job_name = record.job.name if record.job else str(record.job_id)
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
            task_update.requirement_group_id is not None
            and task_update.requirement_group_id != orm_record.requirement_group_id
        ):
            await self._validate_group_for_job(
                task_update.requirement_group_id, orm_record.job_id
            )
        updated = await self.update(orm_record, task_update, partial=True)
        # Detach the cached instance so the re-fetch builds a fresh one with
        # selectin relationships reloaded (e.g. the newly linked
        # requirement_group) — the session keeps instances live across commit,
        # so a plain re-fetch would return the stale cached relationship.
        self.session.expunge(updated)
        updated = await self.get_by_id(updated.id)
        schema = RecruitmentTaskSchema.model_validate(updated)
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
            and orm_record.requirement_group_id is None
        ):
            raise await self._resolve_domain_error(
                RecruitmentTaskRequirementGroupRequired()
            )
        target_status = await self._status_by_name(target_key.value)
        # Assign the relationship (not just the FK) so the returned schema's
        # nested status is correct even though the session keeps instances live
        # across commit (expire_on_commit=False).
        orm_record.status = target_status
        now = datetime.now(timezone.utc)
        if target_key == RecruitmentTaskStatusKey.IN_PROCESS:
            orm_record.in_process_at = now
        elif target_key in CLOSED_STATUS_KEYS:
            orm_record.closed_at = now
        await self.session.commit()
        refreshed = await self.get_by_id(task_id)
        schema = RecruitmentTaskSchema.model_validate(refreshed)
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
