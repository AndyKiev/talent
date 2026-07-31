from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.employee_fact_type.employee_fact_type_model import EmployeeFactType


class EmployeeFactTypeRepository(BaseRepository):
    """CRUD only — everything is inherited from BaseRepository."""

    model = EmployeeFactType
