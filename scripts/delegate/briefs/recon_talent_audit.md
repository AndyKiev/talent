```json
{
  "max_iterations": 1,
  "allow_paths": [],
  "validate": []
}
```

# Objective

RECON ONLY. Write no files. Read the source below and return a compact digest
that another engineer can write API tests from WITHOUT opening the source.

Output plain markdown, no ```file: blocks. Be exhaustive on facts, terse on prose.
Hard limit: 120 lines.

Return exactly these sections:

## Endpoints
One markdown table row per route, in declaration order:
`| METHOD | full path (router prefix + route path) | query/body params | success status | response shape |`
List EVERY route. If a route does NOT exist (e.g. no GET by id), say so
explicitly in a line under the table — a missing route is the single most
important fact for a test author.

## Schemas
For each Pydantic schema: name, then `field: type` lines. Mark validation
constraints (ge/le/max_length) explicitly.

## Rules enforced in service code
Numbered list. For each: the condition, and the HTTP status it produces.
Distinguish Pydantic-schema rejections (422) from service-raised domain errors
(400/403/404).

## Ids a test must obtain
What a test needs before it can create a record, and the least fragile way to
get it over HTTP.

## Traps
Anything that would make a naive test pass vacuously or fail for the wrong
reason.

# Source

## backend/api_v1/talent_audit/talent_audit_views.py
```python
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from fastapi.security import HTTPBearer

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.talent_audit.talent_audit_dependencies import (
    get_talent_audit_service,
    talent_audit_by_id,
)
from backend.api_v1.talent_audit.talent_audit_schema import (
    TalentAudit as TalentAuditSchema,
)
from backend.api_v1.talent_audit.talent_audit_schema import (
    TalentAuditCreate,
    TalentAuditUpdate,
)
from backend.api_v1.talent_audit.talent_audit_service import TalentAuditService
from backend.auth.guards import Guard
from backend.utils.enums import EssenceName, OperationVerb

router = APIRouter(
    prefix="/talent_audits",
    tags=["Talent Audits"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get(
    "",
    response_model=list[TalentAuditSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.TALENT_AUDIT)],
)
async def get_talent_audits(
    service: Annotated[TalentAuditService, Depends(get_talent_audit_service)],
    sort: str | None = Query(
        None,
        description='JSON for sorting: {"field": "asc|desc"} or [{"field1": "asc"}, "field2"]',
    ),
):
    return await service.get_talent_audits(sort=sort)


@router.get(
    "/{talent_audit_id}",
    response_model=TalentAuditSchema,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.TALENT_AUDIT)],
)
async def get_talent_audit(
    record: TalentAuditSchema = Depends(talent_audit_by_id),
):
    return record


@router.get(
    "/by_employee/{employee_id}",
    response_model=TalentAuditSchema,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.TALENT_AUDIT)],
)
async def get_talent_audit_by_employee(
    employee_id: int,
    service: Annotated[TalentAuditService, Depends(get_talent_audit_service)],
):
    return await service.get_by_employee_id(employee_id)


@router.post(
    "",
    response_model=MutationResponse[TalentAuditSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.CREATE, EssenceName.TALENT_AUDIT)],
)
async def create_talent_audit(
    audit_in: TalentAuditCreate,
    service: Annotated[TalentAuditService, Depends(get_talent_audit_service)],
):
    return await service.create_talent_audit(audit_in)


@router.patch(
    "/{talent_audit_id}",
    response_model=MutationResponse[TalentAuditSchema],
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.TALENT_AUDIT)],
)
async def update_talent_audit(
    audit_update: TalentAuditUpdate,
    record: TalentAuditSchema = Depends(talent_audit_by_id),
    service: Annotated[TalentAuditService, Depends(get_talent_audit_service)] = None,
):
    return await service.update_talent_audit(record.id, audit_update)


@router.delete(
    "/{talent_audit_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.DELETE, EssenceName.TALENT_AUDIT)],
)
async def delete_talent_audit(
    talent_audit_id: int,
    service: Annotated[TalentAuditService, Depends(get_talent_audit_service)],
):
    await service.delete_talent_audit(talent_audit_id)
```

## backend/api_v1/talent_audit/talent_audit_schema.py
```python
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class TalentAuditBase(BaseModel):
    employee_id: int
    status_id: int


class TalentAuditCreate(TalentAuditBase):
    # created_by injected from the authenticated user in the service
    # talent_plus is not set at creation; defaults to False in the DB.
    pass


class TalentAuditUpdate(BaseModel):
    # All optional — PATCH may carry only status_id, only talent_plus, or both.
    status_id: int | None = None
    talent_plus: bool | None = None


class TalentAudit(TalentAuditBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    talent_plus: bool
    created_by: int
    created_at: datetime
```

## backend/api_v1/talent_audit/talent_audit_model.py
```python
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin

if TYPE_CHECKING:
    from backend.api_v1.employee.employee_model import Employee
    from backend.api_v1.talent_audit_interview.talent_audit_interview_model import (
        TalentAuditInterview,
    )
    from backend.api_v1.talent_audit_job.talent_audit_job_model import TalentAuditJob
    from backend.api_v1.talent_audit_status.talent_audit_status_model import (
        TalentAuditStatus,
    )


class TalentAudit(IntIdPkMixin, Base):
    __tablename__ = "talent_audit"

    employee_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("employees.id", ondelete="RESTRICT"),
        nullable=False,
        unique=True,
    )
    status_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("talent_audit_statuses.id", ondelete="RESTRICT"),
        nullable=False,
    )
    talent_plus: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false", default=False
    )
    created_by: Mapped[int] = mapped_column(
        Integer, ForeignKey("employees.id", ondelete="RESTRICT"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # Relationships
    employee: Mapped["Employee"] = relationship(
        foreign_keys=[employee_id],
        lazy="selectin",
    )
    status: Mapped["TalentAuditStatus"] = relationship(
        back_populates="talent_audits",
        lazy="selectin",
    )
    creator: Mapped["Employee"] = relationship(
        foreign_keys=[created_by],
        lazy="selectin",
    )
    jobs: Mapped[list["TalentAuditJob"]] = relationship(
        back_populates="talent_audit",
        lazy="selectin",
    )
    interviews: Mapped[list["TalentAuditInterview"]] = relationship(
        back_populates="talent_audit",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"<TalentAudit(id={self.id}, "
            f"employee_id={self.employee_id}, "
            f"status_id={self.status_id}, "
            f"talent_plus={self.talent_plus})>"
        )
```

## backend/api_v1/talent_audit/talent_audit_messages.py
```python
from backend.api_v1.base.errors import (
    AlreadyExistsError,
    DeleteError,
    DomainError,
    NotFoundError,
)
from backend.api_v1.base.success import (
    CreateSuccess,
    DeleteSuccess,
    DomainSuccess,
    UpdateSuccess,
)


class TalentAuditNotFound(NotFoundError):
    message_key = "talentAuditNotFound"

    def __init__(self, audit_id: int) -> None:
        self.template_vars = {"auditId": audit_id}
        self.fallback = f"Talent audit with ID {audit_id} not found"
        super().__init__("TalentAudit", "id", audit_id)


class TalentAuditAlreadyExists(AlreadyExistsError):
    message_key = "talentAuditAlreadyExists"

    def __init__(self, employee_id: int) -> None:
        self.template_vars = {"employeeId": employee_id}
        self.fallback = f"Talent audit for employee ID {employee_id} already exists"
        super().__init__("TalentAudit", "employee_id", employee_id)


class TalentAuditDeleteError(DeleteError):
    message_key = "talentAuditDeleteError"

    def __init__(self, audit_id: int) -> None:
        self.template_vars = {"auditId": audit_id}
        self.fallback = (
            f"Talent audit with ID {audit_id} cannot be deleted "
            f"because it is referenced by other records"
        )
        DomainError.__init__(self, self.fallback)


class TalentAuditCreateSuccess(CreateSuccess):
    message_key = "talentAuditCreateSuccess"

    def __init__(self, employee_id: int) -> None:
        self.template_vars = {"employeeId": employee_id}
        self.fallback = (
            f"Talent audit for employee ID {employee_id} successfully created"
        )
        DomainSuccess.__init__(self, self.fallback)


class TalentAuditUpdateSuccess(UpdateSuccess):
    message_key = "talentAuditUpdateSuccess"

    def __init__(self, audit_id: int) -> None:
        self.template_vars = {"auditId": audit_id}
        self.fallback = f"Talent audit with ID {audit_id} successfully updated"
        DomainSuccess.__init__(self, self.fallback)


class TalentAuditDeleteSuccess(DeleteSuccess):
    message_key = "talentAuditDeleteSuccess"

    def __init__(self, audit_id: int) -> None:
        self.template_vars = {"auditId": audit_id}
        self.fallback = f"Talent audit with ID {audit_id} successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class TalentAuditTalentPlusEnableSuccess(UpdateSuccess):
    message_key = "talentAuditTalentPlusEnableSuccess"

    def __init__(self, audit_id: int) -> None:
        self.template_vars = {"auditId": audit_id}
        self.fallback = f"Talent + enabled for audit ID {audit_id}"
        DomainSuccess.__init__(self, self.fallback)


class TalentAuditTalentPlusDisableSuccess(UpdateSuccess):
    message_key = "talentAuditTalentPlusDisableSuccess"

    def __init__(self, audit_id: int) -> None:
        self.template_vars = {"auditId": audit_id}
        self.fallback = f"Talent + disabled for audit ID {audit_id}"
        DomainSuccess.__init__(self, self.fallback)
```

## backend/api_v1/talent_audit/talent_audit_service.py
```python

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
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
)


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
```

## backend/api_v1/talent_audit/talent_audit_repository.py
```python

from sqlalchemy import select

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.talent_audit.talent_audit_model import TalentAudit


class TalentAuditRepository(BaseRepository):
    model = TalentAudit

    async def get_by_employee_id(self, employee_id: int) -> TalentAudit | None:
        """Return the single audit record for a given employee."""
        stmt = select(TalentAudit).where(TalentAudit.employee_id == employee_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
```

## backend/api_v1/talent_audit/talent_audit_dependencies.py
```python
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.api_v1.talent_audit.talent_audit_repository import TalentAuditRepository
from backend.api_v1.talent_audit.talent_audit_schema import (
    TalentAudit as TalentAuditSchema,
)
from backend.api_v1.talent_audit.talent_audit_service import TalentAuditService
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


async def get_talent_audit_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> TalentAuditService:
    return TalentAuditService(
        repository=TalentAuditRepository(session=session),
        user=user,
        session=session,
    )


async def talent_audit_by_id(
    talent_audit_id: int,
    service: TalentAuditService = Depends(get_talent_audit_service),
) -> TalentAuditSchema:
    record = await service.get_by_id(talent_audit_id)
    return TalentAuditSchema.model_validate(record)
```

