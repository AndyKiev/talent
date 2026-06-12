from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.education_degree.education_degree_model import EducationDegree


class EducationDegreeRepository(BaseRepository):
    model = EducationDegree
