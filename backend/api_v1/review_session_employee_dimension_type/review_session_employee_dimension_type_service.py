
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.review_session_employee_dimension_type.review_session_employee_dimension_type_messages import (
    ReviewSessionEmployeeDimensionTypeKeyNotFound,
    ReviewSessionEmployeeDimensionTypeNotFound,
)
from backend.api_v1.review_session_employee_dimension_type.review_session_employee_dimension_type_model import (
    ReviewSessionEmployeeDimensionType,
)
from backend.api_v1.review_session_employee_dimension_type.review_session_employee_dimension_type_repository import (
    ReviewSessionEmployeeDimensionTypeRepository,
)


class ReviewSessionEmployeeDimensionTypeService(BaseService):
    """A tiny READ-ONLY lookup essence — the two rows are seeded.

    There is deliberately no create/update/delete: the keys ('strong',
    'develop') are a code contract. The strong side ranks competences by score
    descending and the to-develop side ascending, and `flip_competence` means
    "move to the other side" — a third row could be stored but nothing would
    know how to rank it. Only the display name is meant to change, and that is
    a translation, not a row edit.
    """

    def __init__(
        self,
        repository: ReviewSessionEmployeeDimensionTypeRepository,
        user: EmployeeSchema | None = None,
        session: AsyncSession | None = None,
    ) -> None:
        super().__init__(repository, user=user, session=session)

    async def get_by_id(self, id: int) -> ReviewSessionEmployeeDimensionType:
        record = await self.repository.get_by_id(id)
        if not record:
            raise await self._resolve_domain_error(
                ReviewSessionEmployeeDimensionTypeNotFound(id)
            )
        return record

    async def get_by_key(self, key: str) -> ReviewSessionEmployeeDimensionType:
        """Resolve a side BY KEY — the way every piece of business logic must
        reach these rows, so that reseeding (which changes ids) is harmless."""
        record = await self.session.scalar(
            select(ReviewSessionEmployeeDimensionType).where(
                ReviewSessionEmployeeDimensionType.key == key
            )
        )
        if not record:
            raise await self._resolve_domain_error(
                ReviewSessionEmployeeDimensionTypeKeyNotFound(key)
            )
        return record
