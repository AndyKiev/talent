from backend.api_v1.base.success import DomainSuccess, DeleteSuccess, CreateSuccess


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
        self.fallback = f"Job '{job_name}' successfully removed from group '{group_name}'"
        DomainSuccess.__init__(self, self.fallback)


class JobJobGroupLinkSetSuccess(DomainSuccess):
    message_key = "jobJobGroupLinkSetSuccess"

    def __init__(self, job_name: str, count: int) -> None:
        self.template_vars = {"jobName": job_name, "count": count}
        self.fallback = f"Job '{job_name}' groups updated: {count} group(s) assigned"
        DomainSuccess.__init__(self, self.fallback)
