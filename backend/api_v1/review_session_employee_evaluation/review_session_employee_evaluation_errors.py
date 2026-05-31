from backend.api_v1.base.errors import NotFoundError, DomainError


class EvaluationNotFound(NotFoundError):
    message_key = "evaluationNotFound"

    def __init__(self, eval_id: int) -> None:
        self.template_vars = {"typeId": eval_id}
        self.fallback = f"Evaluation with ID {eval_id} not found"
        super().__init__("Evaluation", "id", eval_id)


class EvaluationNotEditable(DomainError):
    message_key = "evaluationNotEditable"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "Evaluation cannot be edited - review session is not open"
        super().__init__(self.fallback)
