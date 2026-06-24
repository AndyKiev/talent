from typing import Optional, List, Tuple

from sqlalchemy import select, func, and_

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.department_type.department_type_model import DepartmentType
from backend.api_v1.department_type_job_link.department_type_job_link_model import (
    DepartmentTypeJobLink,
)
from backend.api_v1.department_type_parental_links.department_type_parental_link_model import (
    DepartmentTypeParentalLink,
)


class DepartmentTypeRepository(BaseRepository):

    model = DepartmentType

    async def get_with_link_stats(
        self,
        is_active: Optional[bool] = None,
    ) -> List[Tuple[DepartmentType, List[str], int]]:
        """
        Return (DepartmentType, parent_names, job_count) tuples.

        - job_count: number of rows in department_type_job_links for the type,
          computed as a correlated scalar subquery to avoid join fan-out.
        - parent_names: names of all parent department types (M2M via
          department_type_parental_links), aggregated with array_agg.
        """
        ParentType = DepartmentType.__table__.alias("parent_type")

        # Correlated scalar subquery: count of job links per department type
        job_count_sq = (
            select(func.count(DepartmentTypeJobLink.id))
            .where(DepartmentTypeJobLink.department_type_id == DepartmentType.id)
            .correlate(DepartmentType)
            .scalar_subquery()
        )

        stmt = (
            select(
                DepartmentType,
                func.array_remove(func.array_agg(ParentType.c.name), None).label(
                    "parent_names"
                ),
                job_count_sq.label("job_count"),
            )
            .select_from(DepartmentType)
            .outerjoin(
                DepartmentTypeParentalLink,
                DepartmentTypeParentalLink.child_id == DepartmentType.id,
            )
            .outerjoin(
                ParentType,
                ParentType.c.id == DepartmentTypeParentalLink.parent_id,
            )
            .group_by(DepartmentType.id)
            .order_by(DepartmentType.id)
        )

        if is_active is not None:
            stmt = stmt.where(DepartmentType.is_active == is_active)

        result = await self.session.execute(stmt)
        return [
            (record, list(parent_names or []), job_count)
            for record, parent_names, job_count in result.all()
        ]
