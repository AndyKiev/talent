from backend.api_v1.base.errors import NotFoundError
from backend.api_v1.base.success import DomainSuccess


class TrainingTypeNotFoundForJobLink(NotFoundError):
    message_key = "trainingTypeNotFoundForJobLink"

    def __init__(self, training_type_id: int) -> None:
        self.template_vars = {"trainingTypeId": training_type_id}
        self.fallback = f"Training type with ID {training_type_id} not found"
        super().__init__("TrainingType", "id", training_type_id)


class JobsNotFoundForTrainingTypeLink(NotFoundError):
    message_key = "jobsNotFoundForTrainingTypeLink"

    def __init__(self, missing_ids: set) -> None:
        ids_str = ", ".join(str(i) for i in sorted(missing_ids))
        self.template_vars = {"ids": ids_str}
        self.fallback = f"Jobs with IDs {{{ids_str}}} not found"
        super().__init__("Job", "ids", ids_str)


class JobNotFoundForTrainingTypeLink(NotFoundError):
    message_key = "jobNotFoundForTrainingTypeLink"

    def __init__(self, job_id: int) -> None:
        self.template_vars = {"jobId": job_id}
        self.fallback = f"Job with ID {job_id} not found"
        super().__init__("Job", "id", job_id)


class TrainingTypesNotFoundForJobLink(NotFoundError):
    message_key = "trainingTypesNotFoundForJobLink"

    def __init__(self, missing_ids: set) -> None:
        ids_str = ", ".join(str(i) for i in sorted(missing_ids))
        self.template_vars = {"ids": ids_str}
        self.fallback = f"Training types with IDs {{{ids_str}}} not found"
        super().__init__("TrainingType", "ids", ids_str)


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
