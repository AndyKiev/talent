from typing import Optional, List

from sqlalchemy import select

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.department_region_link.department_region_link_model import (
    DepartmentRegionLink,
)


class DepartmentRegionLinkRepository(BaseRepository):
    model = DepartmentRegionLink

    async def get_by_department_id(
        self, department_id: int
    ) -> Optional[DepartmentRegionLink]:
        """Fetch the single link for a department (one-to-one)."""
        return (
            await self.session.execute(
                select(DepartmentRegionLink).where(
                    DepartmentRegionLink.department_id == department_id,
                )
            )
        ).scalar_one_or_none()

    async def get_by_region_id(self, region_id: int) -> List[DepartmentRegionLink]:
        """All department links for a region."""
        result = await self.session.execute(
            select(DepartmentRegionLink).where(
                DepartmentRegionLink.region_id == region_id,
            )
        )
        return list(result.scalars().all())
