from backend.api_v1.base.errors import (
    NotFoundError,
    AlreadyExistsError,
    DeleteError,
)
from backend.api_v1.base.success import DomainSuccess, DeleteSuccess, CreateSuccess


class JobProcessRoleLinkNotFound(NotFoundError):
    message_key = "jobProcessRoleLinkNotFound"

    def __init__(self, job_id: int, process_role_id: int) -> None:
        self.template_vars = {"jobId": job_id, "processRoleId": process_role_id}
        self.fallback = (
            f"Link between job ID {job_id} and process role ID {process_role_id} "
            f"not found"
        )
        super().__init__(
            "JobProcessRoleLink", "job_id/process_role_id", f"{job_id}/{process_role_id}"
        )


class JobAlreadyLinkedToProcessRole(AlreadyExistsError):
    message_key = "jobAlreadyLinkedToProcessRole"

    def __init__(self, job_name: str, process_name: str, role_name: str) -> None:
        self.template_vars = {
            "jobName": job_name,
            "processName": process_name,
            "roleName": role_name,
        }
        self.fallback = (
            f"Job '{job_name}' is already linked to "
            f"'{process_name} / {role_name}'"
        )
        super().__init__(
            "JobProcessRoleLink", "job/process_role", f"{job_name}/{process_name}/{role_name}"
        )


class JobProcessRoleLinkDeleteError(DeleteError):
    message_key = "jobProcessRoleLinkDeleteError"

    def __init__(self, name: str) -> None:
        self.template_vars = {"name": name}
        self.fallback = (
            f"Job process role link '{name}' cannot be deleted "
            f"because it is referenced by other records"
        )
        super().__init__("JobProcessRoleLink", name)


class JobNotFoundForProcessRoleLink(NotFoundError):
    message_key = "jobNotFoundForProcessRoleLink"

    def __init__(self, job_id: int) -> None:
        self.template_vars = {"jobId": job_id}
        self.fallback = f"Job with ID {job_id} not found"
        super().__init__("Job", "id", job_id)


class ProcessRoleNotFoundForLink(NotFoundError):
    message_key = "processRoleNotFoundForLink"

    def __init__(self, process_role_id: int) -> None:
        self.template_vars = {"processRoleId": process_role_id}
        self.fallback = f"Process role with ID {process_role_id} not found"
        super().__init__("ProcessRole", "id", process_role_id)


class JobProcessRoleLinkCreateSuccess(CreateSuccess):
    message_key = "jobProcessRoleLinkCreateSuccess"

    def __init__(self, job_name: str, process_name: str, role_name: str) -> None:
        self.template_vars = {
            "jobName": job_name,
            "processName": process_name,
            "roleName": role_name,
        }
        self.fallback = (
            f"Job '{job_name}' successfully linked to "
            f"process role '{process_name} / {role_name}'"
        )
        DomainSuccess.__init__(self, self.fallback)


class JobProcessRoleLinkDeleteSuccess(DeleteSuccess):
    message_key = "jobProcessRoleLinkDeleteSuccess"

    def __init__(self, job_name: str, process_name: str, role_name: str) -> None:
        self.template_vars = {
            "jobName": job_name,
            "processName": process_name,
            "roleName": role_name,
        }
        self.fallback = (
            f"Job '{job_name}' successfully removed from "
            f"process role '{process_name} / {role_name}'"
        )
        DomainSuccess.__init__(self, self.fallback)
