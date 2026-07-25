from dataclasses import dataclass

from backend.api_v1.base.errors import DomainError


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


@dataclass
class ReviewSessionDepartmentCreateSuccess:
    session_id: int
    department_id: int

    def __str__(self):
        return (
            f"Department {self.department_id} linked to session {self.session_id}"
        )


@dataclass
class ReviewSessionDepartmentDeleteSuccess:
    def __str__(self):
        return "Department link removed from session"
