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


class RecruitmentDimensionNotFound(NotFoundError):
    message_key = "recruitmentDimensionNotFound"

    def __init__(self, dim_id: int) -> None:
        self.template_vars = {"typeId": dim_id}
        self.fallback = f"Recruitment dimension with ID {dim_id} not found"
        super().__init__("RecruitmentDimension", "id", dim_id)


class RecruitmentDimensionNotFoundByName(NotFoundError):
    message_key = "recruitmentDimensionNotFoundByName"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Recruitment dimension with name '{name}' not found"
        super().__init__("RecruitmentDimension", "name", name)


class RecruitmentDimensionNameTaken(AlreadyExistsError):
    message_key = "recruitmentDimensionNameTaken"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Recruitment dimension with name '{name}' already exists"
        super().__init__("RecruitmentDimension", "name", name)


class RecruitmentDimensionInvalidColor(DomainError):
    message_key = "recruitmentDimensionInvalidColor"

    def __init__(self, color: str) -> None:
        self.template_vars = {"color": color}
        self.fallback = f"Invalid color '{color}'. Use a hex value like #2E7D32."
        super().__init__(self.fallback)


class RecruitmentDimensionDeleteError(DeleteError):
    message_key = "recruitmentDimensionDeleteError"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = (
            f"Recruitment dimension '{name}' cannot be deleted "
            f"because it is referenced by requirement points"
        )
        DomainError.__init__(self, self.fallback)


class RecruitmentDimensionDeleteSuccess(DeleteSuccess):
    message_key = "recruitmentDimensionDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Recruitment dimension '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class RecruitmentDimensionCreateSuccess(CreateSuccess):
    message_key = "recruitmentDimensionCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Recruitment dimension '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class RecruitmentDimensionUpdateSuccess(UpdateSuccess):
    message_key = "recruitmentDimensionUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Recruitment dimension '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)
