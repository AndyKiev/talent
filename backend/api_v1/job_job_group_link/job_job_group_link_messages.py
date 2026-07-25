from backend.api_v1.base.errors import (
    AlreadyExistsError,
    DeleteError,
    DomainError,
    NotFoundError,
    RelationshipError,
)
from backend.api_v1.base.success import CreateSuccess, DeleteSuccess, DomainSuccess


class JobJobGroupLinkNotFound(NotFoundError):
    message_key = "jobJobGroupLinkNotFound"

    def __init__(self, job_id: int, job_group_id: int) -> None:
        self.template_vars = {"jobId": job_id, "jobGroupId": job_group_id}
        self.fallback = (
            f"Link between job ID {job_id} and job group ID {job_group_id} not found"
        )
        super().__init__(
            "JobJobGroupLink", "job_id/job_group_id", f"{job_id}/{job_group_id}"
        )


class JobAlreadyInJobGroup(AlreadyExistsError):
    message_key = "jobAlreadyInJobGroup"

    def __init__(self, job_name: str, group_name: str) -> None:
        self.template_vars = {"jobName": job_name, "groupName": group_name}
        self.fallback = (
            f"Job '{job_name}' is already linked to job group '{group_name}'"
        )
        super().__init__("JobJobGroupLink", "job/group", f"{job_name}/{group_name}")


class JobJobGroupLinkDeleteError(DeleteError):
    message_key = "jobJobGroupLinkDeleteError"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = f"Job group link '{name}' cannot be deleted because it is referenced by other records"
        DomainError.__init__(self, self.fallback)


class JobGroupTypeSingletonViolation(RelationshipError):
    """
    Raised when a job attempts to join a second group whose JobGroupType
    has allow_multiple=False.

    Example: JobGroupType "Level" has allow_multiple=False.
    Job "Engineer" is already in group "Junior" (type "Level").
    Attempting to add "Senior" (also type "Level") raises this error.
    """

    message_key = "jobGroupTypeSingletonViolation"

    def __init__(
        self,
        job_name: str,
        type_name: str,
        existing_group_name: str,
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


class JobGroupNotFoundForLink(NotFoundError):
    message_key = "jobGroupNotFoundForLink"

    def __init__(self, job_group_id: int) -> None:
        self.template_vars = {"jobGroupId": job_group_id}
        self.fallback = f"Job group with ID {job_group_id} not found"
        super().__init__("JobGroup", "id", job_group_id)


class JobGroupsNotFoundForLink(NotFoundError):
    message_key = "jobGroupsNotFoundForLink"

    def __init__(self, missing_ids: set) -> None:
        ids_str = ", ".join(str(i) for i in sorted(missing_ids))
        self.template_vars = {"ids": ids_str}
        self.fallback = f"Job groups with IDs {{{ids_str}}} not found"
        super().__init__("JobGroup", "ids", ids_str)


class JobNotFoundForLink(NotFoundError):
    message_key = "jobNotFoundForLink"

    def __init__(self, job_id: int) -> None:
        self.template_vars = {"jobId": job_id}
        self.fallback = f"Job with ID {job_id} not found"
        super().__init__("Job", "id", job_id)


class JobJobGroupLinkCreateSuccess(CreateSuccess):
    message_key = "jobJobGroupLinkCreateSuccess"

    def __init__(self, job_name: str, group_name: str) -> None:
        self.template_vars = {"jobName": job_name, "groupName": group_name}
        self.fallback = f"Job '{job_name}' successfully linked to group '{group_name}'"
        DomainSuccess.__init__(self, self.fallback)


class JobJobGroupLinkDeleteSuccess(DeleteSuccess):
    message_key = "jobJobGroupLinkDeleteSuccess"

    def __init__(self, job_name: str, group_name: str) -> None:
        self.template_vars = {"jobName": job_name, "groupName": group_name}
        self.fallback = (
            f"Job '{job_name}' successfully removed from group '{group_name}'"
        )
        DomainSuccess.__init__(self, self.fallback)


class JobJobGroupLinkSetSuccess(DomainSuccess):
    message_key = "jobJobGroupLinkSetSuccess"

    def __init__(self, job_name: str, count: int) -> None:
        self.template_vars = {"jobName": job_name, "count": count}
        self.fallback = f"Job '{job_name}' groups updated: {count} group(s) assigned"
        DomainSuccess.__init__(self, self.fallback)
