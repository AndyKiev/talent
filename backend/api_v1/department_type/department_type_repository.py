from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.department_type.department_type_model import DepartmentType


class DepartmentTypeRepository(BaseRepository):

    model = DepartmentType
