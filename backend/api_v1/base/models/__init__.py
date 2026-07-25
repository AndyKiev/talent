__all__ = [
    "Base",
    "Employee",
    "IntIdPkMixin",
    "TimestampMixin",
]

from backend.api_v1.base.base_model_oracle import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin, TimestampMixin
from backend.api_v1.employee.employee_model import Employee

