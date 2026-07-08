from backend.api_v1.base.errors import (
    NotFoundError,
    AlreadyExistsError,
    DomainError,
    DeleteError,
)
from backend.api_v1.base.success import (
    DomainSuccess,
    DeleteSuccess,
    CreateSuccess,
    UpdateSuccess,
)


class PersonNotFound(NotFoundError):
    message_key = "personNotFound"

    def __init__(self, person_id: int) -> None:
        self.template_vars = {"personId": person_id}
        self.fallback = f"Person with ID {person_id} not found"
        super().__init__("Person", "id", person_id)


class PersonNotFoundForEmployee(NotFoundError):
    message_key = "personNotFoundForEmployee"

    def __init__(self, employee_ref: int | str) -> None:
        self.template_vars = {"employee": employee_ref}
        self.fallback = f"Person for employee '{employee_ref}' not found"
        super().__init__("Person", "employee", employee_ref)


class PersonNameExists(AlreadyExistsError):
    message_key = "personNameExists"

    def __init__(self, last_name: str, first_name: str) -> None:
        self.template_vars = {"lastName": last_name, "firstName": first_name}
        self.fallback = f"Person '{last_name} {first_name}' already exists"
        super().__init__("Person", "name", f"{last_name} {first_name}")


class PersonHasEmployees(DeleteError):
    message_key = "personHasEmployees"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = (
            f"Person '{name}' cannot be deleted because employees reference it"
        )
        DomainError.__init__(self, self.fallback)


class PersonDeleteError(DeleteError):
    message_key = "personDeleteError"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Person '{name}' cannot be deleted because it is referenced by other records"
        DomainError.__init__(self, self.fallback)


class PersonDeleteSuccess(DeleteSuccess):
    message_key = "personDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Person '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class PersonCreateSuccess(CreateSuccess):
    message_key = "personCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Person '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class PersonUpdateSuccess(UpdateSuccess):
    message_key = "personUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Person '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)
