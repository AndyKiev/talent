from backend.api_v1.base.errors import DomainError, NotFoundError
from backend.api_v1.base.success import DomainSuccess


class EmployeeMissionNotFound(NotFoundError):
    message_key = "employeeMissionNotFound"

    def __init__(self, mission_id: int) -> None:
        self.template_vars = {"missionId": mission_id}
        self.fallback = f"Mission with ID {mission_id} not found"
        super().__init__("EmployeeMission", "id", mission_id)


class MissionDurationOutOfRange(DomainError):
    """Duration outside 1..mission_max_duration_months (the app setting)."""

    message_key = "missionDurationOutOfRange"

    def __init__(self, max_months: int) -> None:
        self.template_vars = {"max": max_months}
        self.fallback = f"Duration must be between 1 and {max_months} months"
        super().__init__(self.fallback)


class MissionEmployeeNotFound(NotFoundError):
    """The mission's would-be owner does not exist. Caught before the insert so
    a bad id is a 404 rather than an FK-violation 500."""

    message_key = "missionEmployeeNotFound"

    def __init__(self, employee_id: int) -> None:
        self.template_vars = {"employeeId": employee_id}
        self.fallback = f"Employee with ID {employee_id} not found"
        super().__init__("Employee", "id", employee_id)


class MissionStatusNotSeeded(DomainError):
    """A required status row is missing. Statuses are resolved BY KEY, so this
    means the seed never ran (or a key was renamed) — fail loudly rather than
    write a mission with a wrong status."""

    message_key = "missionStatusNotSeeded"

    def __init__(self, key: str) -> None:
        self.template_vars = {"key": key}
        self.fallback = f"Mission status '{key}' is not seeded"
        super().__init__(self.fallback)


class MissionRevertDenied(DomainError):
    """Only admin/dev may roll a mission's progress back."""

    message_key = "missionRevertDenied"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "Only an administrator may revert a mission's status"
        super().__init__(self.fallback)


class MissionNothingToRevert(DomainError):
    message_key = "missionNothingToRevert"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "No earlier KPI progress recorded for this mission"
        super().__init__(self.fallback)


class MissionRevertSuccess(DomainSuccess):
    message_key = "missionRevertSuccess"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "Mission progress reverted"
        DomainSuccess.__init__(self, self.fallback)


class MissionMaxKpisReached(DomainError):
    """More KPIs than `mission_max_kpis` allows."""

    message_key = "missionMaxKpisReached"

    def __init__(self, max_kpis: int) -> None:
        self.template_vars = {"max": max_kpis}
        self.fallback = f"A mission may have at most {max_kpis} KPI(s)"
        super().__init__(self.fallback)


class MissionMaxActiveReached(DomainError):
    """The employee already has `mission_max_active` ACTIVE missions.

    Active excludes expired and accomplished ones, so the fix is to finish or
    outlive a mission — not to delete one.
    """

    message_key = "missionMaxActiveReached"

    def __init__(self, max_active: int) -> None:
        self.template_vars = {"max": max_active}
        self.fallback = (
            f"This employee already has {max_active} active mission(s). "
            "Complete one (all KPIs at 100%) or wait for its period to end."
        )
        super().__init__(self.fallback)


class MissionDimensionNotFound(NotFoundError):
    message_key = "missionDimensionNotFound"

    def __init__(self, dimension_id: int) -> None:
        self.template_vars = {"dimensionId": dimension_id}
        self.fallback = f"Competence with ID {dimension_id} not found"
        super().__init__("ReviewDimension", "id", dimension_id)


class EmployeeMissionCreateSuccess(DomainSuccess):
    message_key = "employeeMissionCreateSuccess"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "Mission successfully created"
        DomainSuccess.__init__(self, self.fallback)


class EmployeeMissionUpdateSuccess(DomainSuccess):
    message_key = "employeeMissionUpdateSuccess"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "Mission successfully updated"
        DomainSuccess.__init__(self, self.fallback)


class EmployeeMissionDeleteSuccess(DomainSuccess):
    message_key = "employeeMissionDeleteSuccess"

    def __init__(self) -> None:
        self.template_vars = {}
        self.fallback = "Mission successfully deleted"
        DomainSuccess.__init__(self, self.fallback)
