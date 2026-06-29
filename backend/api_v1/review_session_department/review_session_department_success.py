from dataclasses import dataclass


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
