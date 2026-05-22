from backend.api_v1.base.success import DomainSuccess, DeleteSuccess, CreateSuccess, UpdateSuccess


class EmployeeEventDeleteSuccess(DeleteSuccess):
    message_key = "employeeEventDeleteSuccess"

    def __init__(self, event_id: int) -> None:
        self.template_vars = {"eventId": event_id}
        self.fallback = f"Employee event with ID {event_id} successfully deleted"
        DomainSuccess.__init__(self, self.fallback)


class EmployeeEventCreateSuccess(CreateSuccess):
    message_key = "employeeEventCreateSuccess"

    def __init__(self, event_id: int) -> None:
        self.template_vars = {"eventId": event_id}
        self.fallback = f"Employee event with ID {event_id} successfully created"
        DomainSuccess.__init__(self, self.fallback)


class EmployeeEventUpdateSuccess(UpdateSuccess):
    message_key = "employeeEventUpdateSuccess"

    def __init__(self, event_id: int) -> None:
        self.template_vars = {"eventId": event_id}
        self.fallback = f"Employee event with ID {event_id} successfully updated"
        DomainSuccess.__init__(self, self.fallback)


class EmployeeEventApplySuccess(DomainSuccess):
    message_key = "employeeEventApplySuccess"

    def __init__(self, event_id: int) -> None:
        self.template_vars = {"eventId": event_id}
        self.fallback = f"Employee event with ID {event_id} successfully applied"
        DomainSuccess.__init__(self, self.fallback)
