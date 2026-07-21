from backend.api_v1.base.errors import DomainError, NotFoundError
from backend.api_v1.base.success import DomainSuccess


class EmployeeMissionKpiNotFound(NotFoundError):
    message_key = "employeeMissionKpiNotFound"

    def __init__(self, kpi_id: int) -> None:
        self.template_vars = {"kpiId": kpi_id}
        self.fallback = f"KPI with ID {kpi_id} not found"
        super().__init__("EmployeeMissionKpi", "id", kpi_id)


class MissionLastKpiRequired(DomainError):
    """The DB cannot express "a parent must keep at least one child", so this is
    the delete half of the mandatory-KPI rule (the create half is Pydantic's
    min_length=1 on EmployeeMissionCreate.kpis)."""

    message_key = "missionLastKpiRequired"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "A mission must keep at least one KPI"
        super().__init__(self.fallback)


class MissionKpiTextTooLong(DomainError):
    message_key = "missionKpiTextTooLong"

    def __init__(self, max_length: int) -> None:
        self.template_vars = {"max": max_length}
        self.fallback = f"KPI text must not exceed {max_length} characters"
        super().__init__(self.fallback)


class EmployeeMissionKpiCreateSuccess(DomainSuccess):
    message_key = "employeeMissionKpiCreateSuccess"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "KPI successfully created"
        DomainSuccess.__init__(self, self.fallback)


class EmployeeMissionKpiUpdateSuccess(DomainSuccess):
    message_key = "employeeMissionKpiUpdateSuccess"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "KPI successfully updated"
        DomainSuccess.__init__(self, self.fallback)


class EmployeeMissionKpiDeleteSuccess(DomainSuccess):
    message_key = "employeeMissionKpiDeleteSuccess"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "KPI successfully deleted"
        DomainSuccess.__init__(self, self.fallback)
