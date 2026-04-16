from backend.api_v1.base.errors import (
    NotFoundError,
    AlreadyExistsError,
    RelationshipError,
    DomainError,
    DeleteSuccess,
    DeleteError,
)


# ---------------------------------------------------------------------------
# Each error carries:
#   - a message_key  → looked up in the DB by BaseService._translate()
#   - template_vars  → injected into the message template (e.g. ${jobId})
#   - fallback       → plain-English string used when DB lookup fails
# ---------------------------------------------------------------------------


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


class JobDeleteError(DeleteError):  # was DomainError
    message_key = "jobDeleteError"

    def __init__(self, job_name: str) -> None:
        self.template_vars = {"name": job_name}
        self.fallback = f"Job '{job_name}' cannot be deleted because it is referenced by other records"
        DomainError.__init__(self, self.fallback)


class JobDeleteSuccess(DeleteSuccess):
    message_key = "jobDeleteSuccess"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Job '{name}' successfully deleted"
        DomainError.__init__(self, self.fallback)
