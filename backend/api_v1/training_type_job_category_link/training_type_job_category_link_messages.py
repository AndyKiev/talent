from backend.api_v1.base.errors import NotFoundError
from backend.api_v1.base.success import DomainSuccess


class TrainingTypeNotFoundForJobCategoryLink(NotFoundError):
    message_key = "trainingTypeNotFoundForJobCategoryLink"

    def __init__(self, training_type_id: int) -> None:
        self.template_vars = {"trainingTypeId": training_type_id}
        self.fallback = f"Training type with ID {training_type_id} not found"
        super().__init__("TrainingType", "id", training_type_id)


class JobCategoriesNotFoundForTrainingTypeLink(NotFoundError):
    message_key = "jobCategoriesNotFoundForTrainingTypeLink"

    def __init__(self, missing_ids: set) -> None:
        ids_str = ", ".join(str(i) for i in sorted(missing_ids))
        self.template_vars = {"ids": ids_str}
        self.fallback = f"Job categories with IDs {{{ids_str}}} not found"
        super().__init__("JobCategory", "ids", ids_str)


class TrainingTypeJobCategoryLinkSetSuccess(DomainSuccess):
    message_key = "trainingTypeJobCategoryLinkSetSuccess"

    def __init__(self, training_type_name: str, count: int) -> None:
        self.template_vars = {"trainingTypeName": training_type_name, "count": count}
        self.fallback = (
            f"Training type '{training_type_name}' job categories updated: "
            f"{count} category(ies) assigned"
        )
        DomainSuccess.__init__(self, self.fallback)
