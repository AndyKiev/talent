from backend.api_v1.base.errors import DomainError
from dataclasses import dataclass


@dataclass
class ReviewSessionDepartmentNotFound(DomainError):
    id: int

    def __post_init__(self):
        self.message = f"Review session department with id {self.id} not found"


@dataclass
class ReviewSessionDepartmentAlreadyExists(DomainError):
    session_id: int
    department_id: int

    def __post_init__(self):
        self.message = (
            f"Department {self.department_id} is already linked to session {self.session_id}"
        )
