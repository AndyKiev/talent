from backend.api_v1.base.success import DomainSuccess


class EvaluationSaveSuccess(DomainSuccess):
    message_key = "evaluationSaveSuccess"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "Evaluations saved successfully"
        super().__init__(self.fallback)
