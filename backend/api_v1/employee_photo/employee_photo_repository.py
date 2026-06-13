from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.employee_photo.employee_photo_model import EmployeePhoto


class EmployeePhotoRepository(BaseRepository):
    model = EmployeePhoto
