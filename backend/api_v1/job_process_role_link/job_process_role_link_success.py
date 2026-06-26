from backend.api_v1.base.success import DomainSuccess, DeleteSuccess, CreateSuccess


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
