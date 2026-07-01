from backend.api_v1.base.success import DomainSuccess


class TrainingTypeJobCategoryLinkSetSuccess(DomainSuccess):
    message_key = "trainingTypeJobCategoryLinkSetSuccess"

    def __init__(self, training_type_name: str, count: int) -> None:
        self.template_vars = {"trainingTypeName": training_type_name, "count": count}
        self.fallback = (
            f"Training type '{training_type_name}' job categories updated: "
            f"{count} category(ies) assigned"
        )
        DomainSuccess.__init__(self, self.fallback)
