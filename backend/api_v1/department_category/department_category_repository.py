from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.department_category.department_category_model import DepartmentCategory


class DepartmentCategoryRepository(BaseRepository):

    model = DepartmentCategory
