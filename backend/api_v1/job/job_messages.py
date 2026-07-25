from backend.api_v1.base.errors import (
    AlreadyExistsError,
    DeleteError,
    DomainError,
    NotFoundError,
    RelationshipError,
)
from backend.api_v1.base.success import (
    CreateSuccess,
    DeleteSuccess,
    DomainSuccess,
    UpdateSuccess,
)


class JobNotFound(NotFoundError):
    message_key = "jobNotFound"

    def __init__(self, job_id: int) -> None:
        self.template_vars = {"jobId": job_id}
        self.fallback = f"Job with ID {job_id} not found"
        super().__init__("Job", "id", job_id)


class JobNotFoundByName(NotFoundError):
    message_key = "jobNotFoundByName"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Job with name '{name}' not found"
        super().__init__("Job", "name", name)


class JobNameTaken(AlreadyExistsError):
    message_key = "jobNameTaken"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Job with name '{name}' already exists"
        super().__init__("Job", "name", name)


class JobAlreadyInGroup(RelationshipError):
    message_key = "jobAlreadyInGroup"

    def __init__(self, job_name: str, group_name: str) -> None:
        self.template_vars = {"jobName": job_name, "groupName": group_name}
        self.fallback = f"Job '{job_name}' is already linked to group '{group_name}'"
        super().__init__(self.fallback)


class JobNotInGroup(RelationshipError):
    message_key = "jobNotInGroup"

    def __init__(self, job_name: str, group_name: str) -> None:
        self.template_vars = {"jobName": job_name, "groupName": group_name}
        self.fallback = f"Job '{job_name}' is not linked to group '{group_name}'"
        super().__init__(self.fallback)


class GroupNotFound(NotFoundError):
    message_key = "groupNotFound"

    def __init__(self, group_id: int) -> None:
        self.template_vars = {"groupId": group_id}
        self.fallback = f"User group with ID {group_id} not found"
        super().__init__("UserGroup", "id", group_id)


class GroupsNotFound(NotFoundError):
    message_key = "groupsNotFound"

    def __init__(self, missing_ids: set) -> None:
        ids_str = ", ".join(str(i) for i in sorted(missing_ids))
        self.template_vars = {"ids": ids_str}
        self.fallback = f"User groups with IDs {{{ids_str}}} not found"
        super().__init__("UserGroup", "ids", ids_str)


class JobDeleteError(DeleteError):
    message_key = "jobDeleteError"

    def __init__(self, job_name: str) -> None:
        self.template_vars = {"name": job_name}
        self.fallback = f"Job '{job_name}' cannot be deleted because it is referenced by other records"
        DomainError.__init__(self, self.fallback)


class JobBulkUploadNothingToInsert(DomainError):
    """All rows in the uploaded file were duplicates — nothing was inserted."""

    message_key = "jobBulkUploadNothingToInsert"

    def __init__(self, skipped: int) -> None:
        self.template_vars = {"skipped": skipped}
        self.fallback = (
            f"All {skipped} job(s) from the file already exist in the database "
            "(matched by name or description). Nothing was inserted."
        )
        super().__init__(self.fallback)


class JobBulkUploadInvalidFile(DomainError):
    """Uploaded file is not a valid Excel workbook or is missing required columns."""

    message_key = "jobBulkUploadInvalidFile"

    def __init__(self, reason: str = "") -> None:
        self.template_vars = {"reason": reason}
        self.fallback = (
            f"Invalid file: {reason}" if reason else "Invalid or unreadable Excel file."
        )
        super().__init__(self.fallback)


class JobDeleteSuccess(DeleteSuccess):
    message_key = "jobDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Job '{name}' successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class JobCreateSuccess(CreateSuccess):
    message_key = "jobCreateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Job '{name}' successfully created"
        DomainSuccess.__init__(self, self.fallback)


class JobUpdateSuccess(UpdateSuccess):
    message_key = "jobUpdateSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Job '{name}' successfully updated"
        DomainSuccess.__init__(self, self.fallback)


class JobBulkUploadSuccess(DomainSuccess):
    """Some or all rows were inserted; zero or more were skipped."""

    message_key = "jobBulkUploadSuccess"

    def __init__(self, inserted: int, skipped: int) -> None:
        self.template_vars = {"inserted": inserted, "skipped": skipped}
        self.fallback = (
            f"Bulk upload complete: {inserted} job(s) inserted, "
            f"{skipped} skipped (duplicates by name or description)."
        )
        DomainSuccess.__init__(self, self.fallback)
