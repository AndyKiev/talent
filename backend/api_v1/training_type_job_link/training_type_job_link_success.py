from backend.api_v1.base.success import DomainSuccess


class TrainingTypeJobLinkSetSuccess(DomainSuccess):
    message_key = "trainingTypeJobLinkSetSuccess"

    def __init__(self, training_type_name: str, count: int) -> None:
        self.template_vars = {"trainingTypeName": training_type_name, "count": count}
        self.fallback = (
            f"Training type '{training_type_name}' jobs updated: "
            f"{count} job(s) assigned"
        )
        DomainSuccess.__init__(self, self.fallback)


class TrainingTypeJobLinkSetForJobSuccess(DomainSuccess):
    message_key = "trainingTypeJobLinkSetForJobSuccess"

    def __init__(self, job_name: str, count: int) -> None:
        self.template_vars = {"jobName": job_name, "count": count}
        self.fallback = (
            f"Job '{job_name}' recommended trainings updated: "
            f"{count} training(s) assigned"
        )
        DomainSuccess.__init__(self, self.fallback)
