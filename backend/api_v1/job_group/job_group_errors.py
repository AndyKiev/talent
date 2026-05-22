from backend.api_v1.base.errors import (
    NotFoundError,
    AlreadyExistsError,
    DeleteError,
    DomainError,
    RelationshipError,
)


class JobGroupNotFound(NotFoundError):
    message_key = "jobGroupNotFound"

    def __init__(self, job_group_id: int) -> None:
        self.template_vars = {"jobGroupId": job_group_id}
        self.fallback = f"Job group with ID {job_group_id} not found"
        super().__init__("JobGroup", "id", job_group_id)


class JobGroupNameTaken(AlreadyExistsError):
    message_key = "jobGroupNameTaken"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Job group with name '{name}' already exists"
        super().__init__("JobGroup", "name", name)


class JobGroupDeleteError(DeleteError):
    message_key = "jobGroupDeleteError"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = (
            f"Job group '{name}' cannot be deleted because it is referenced "
            "by other records"
        )
        DomainError.__init__(self, self.fallback)


# ------------------------------------------------------------------
# Job ↔ JobGroup link errors
# ------------------------------------------------------------------

class JobAlreadyInJobGroup(RelationshipError):
    message_key = "jobAlreadyInJobGroup"

    def __init__(self, job_name: str, group_name: str) -> None:
        self.template_vars = {"jobName": job_name, "groupName": group_name}
        self.fallback = (
            f"Job '{job_name}' is already linked to job group '{group_name}'"
        )
        super().__init__(self.fallback)


class JobNotInJobGroup(RelationshipError):
    message_key = "jobNotInJobGroup"

    def __init__(self, job_name: str, group_name: str) -> None:
        self.template_vars = {"jobName": job_name, "groupName": group_name}
        self.fallback = (
            f"Job '{job_name}' is not linked to job group '{group_name}'"
        )
        super().__init__(self.fallback)


class JobGroupTypeSingletonViolation(RelationshipError):
    """
    Raised when a job tries to join a second group of a type whose
    allow_multiple flag is False.
    """

    message_key = "jobGroupTypeSingletonViolation"

    def __init__(
        self, job_name: str, type_name: str, existing_group_name: str
    ) -> None:
        self.template_vars = {
            "jobName": job_name,
            "typeName": type_name,
            "existingGroupName": existing_group_name,
        }
        self.fallback = (
            f"Job '{job_name}' already belongs to group '{existing_group_name}' "
            f"of type '{type_name}', which does not allow multiple groups per job. "
            "Remove the existing group first."
        )
        super().__init__(self.fallback)


class JobJobGroupNotFound(NotFoundError):
    message_key = "jobJobGroupNotFound"

    def __init__(self, job_group_id: int) -> None:
        self.template_vars = {"jobGroupId": job_group_id}
        self.fallback = f"Job group with ID {job_group_id} not found"
        super().__init__("JobGroup", "id", job_group_id)


class JobJobGroupsNotFound(NotFoundError):
    message_key = "jobJobGroupsNotFound"

    def __init__(self, missing_ids: set) -> None:
        ids_str = ", ".join(str(i) for i in sorted(missing_ids))
        self.template_vars = {"ids": ids_str}
        self.fallback = f"Job groups with IDs {{{ids_str}}} not found"
        super().__init__("JobGroup", "ids", ids_str)