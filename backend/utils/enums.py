# backend/utils/enums.py
from enum import Enum, auto

# Canonical display date format (day.month.year), e.g. 31.12.2026.
DATE_FORMAT = "DD.MM.YYYY"


class OperationTypes(Enum):
    """Named operations checked by require_operation (operation admin only).
    EDI-era members were removed; only the operation-management set survives."""

    LINK_USER_GROUP_TO_OPERATION = "link_user_group_to_operation"
    REMOVE_OPERATION_FROM_USER_GROUP = "remove_operation_from_user_group"
    SET_OPERATION_USER_GROUPS = "set_operation_user_groups"
    DELETE_OPERATION = "delete_operation"
    CREATE_OPERATION = "create_operation"
    MODIFY_OPERATION = "modify_operation"


class MoveDirection(str, Enum):
    UP = "up"
    DOWN = "down"
    TOP = "top"
    BOTTOM = "bottom"


class OperationVerb(str, Enum):
    """
    Universal, domain-agnostic action verbs stored in the `operations` table.
    This enum is the *only* enum that must stay in sync with the DB seed.
    It should rarely grow — think twice before adding a new verb.
    """

    VIEW = "view"
    CREATE = "create"
    COPY = "copy"
    MODIFY = "modify"
    DELETE = "delete"
    EXPORT = "export"
    APPROVE = "approve"
    APPLY = "apply"
    ASSIGN = "assign"
    LINK = "link"
    SYNC = "sync"
    REVERT = "revert"


class EssenceName(str, Enum):
    """
    Domain objects (resources) that have access-controlled operations.
    Add a new member here when you introduce a new essence to the system.
    The string value must match the `name` column in the `essences` table
    (populated via seed / Alembic data migration).
    """

    # ── Language / messages ──────────────────────────────────────────────────
    LANG = "lang"
    MSG_KEY = "msg_key"
    MSG = "msg"

    # ── Auth / admin ──────────────────────────────────────────────────────────
    USER_GROUP = "user_group"
    USER_GROUP_TYPE = "user_group_type"
    OPERATION = "operation"
    ESSENCE = "essence"

    # ── HR core ──────────────────────────────────────────────────────────────
    PERSON = "person"
    EMPLOYEE = "employee"
    EMPLOYEE_STATUS = "employee_status"
    DEPARTMENT = "department"
    DEPARTMENT_TYPE = "department_type"
    DEPARTMENT_CATEGORY = "department_category"
    JOB = "job"
    JOB_GROUP = "job_group"
    JOB_GROUP_TYPE = "job_group_type"

    # ── HR events ────────────────────────────────────────────────────────────
    EMPLOYEE_EVENT = "employee_event"
    EMPLOYEE_EVENT_TYPE = "employee_event_type"
    EMPLOYEE_EVENT_STATUS = "employee_event_status"
    EMPLOYEE_EVENT_DIRECTION_TYPE = "employee_event_direction_type"
    EMPLOYEE_EVENT_TYPE_DIRECTION = "employee_event_type_direction"

    # ── Talent audit ─────────────────────────────────────────────────────────
    TALENT_AUDIT = "talent_audit"
    TALENT_AUDIT_JOB = "talent_audit_job"
    TALENT_AUDIT_STATUS = "talent_audit_status"
    TALENT_PERIOD = "talent_period"
    TALENT_STATUS = "talent_status"
    TALENT_AUDIT_JOB_STATUS = "talent_audit_job_status"
    TALENT_AUDIT_INTERVIEW_STATUS = "talent_audit_interview_status"
    TALENT_AUDIT_INTERVIEW = "talent_audit_interview"

    # ── Ported from talent-test ────────────────────────────────────────────────
    HRM_SCOPE = "hrm_scope"
    REGION = "region"
    CHANGE_SESSION = "change_session"
    CHANGE_LOG = "change_log"

    # ── Planning ─────────────────────────────────────────────────────────────
    PLAN_SESSION = "plan_session"
    PLAN_SESSION_STATUS = "plan_session_status"
    PLAN_SCOPE = "plan_scope"
    PLAN_SCOPE_DEFAULT = "plan_scope_default"
    PLAN_CATEGORY_DEFAULT = "plan_category_default"

    # ── People review ─────────────────────────────────────────────────────────
    REVIEW_SESSION = "review_session"
    REVIEW_SESSION_STATUS = "review_session_status"

    # ── Training ─────────────────────────────────────────────────────────────
    TRAINING_LINK_TYPE = "training_link_type"
    TRAINING_CATEGORY = "training_category"
    EMPLOYEE_TRAINING_STATUS = "employee_training_status"
    TRAINING_TYPE = "training_type"
    EMPLOYEE_TRAINING = "employee_training"

    # ── Developer tools ──────────────────────────────────────────────────────
    DB_TABLE = "db_table"
    MENU = "menu"
    APP_SETTING = "app_setting"
    SETTING_VALUE_TYPE = "setting_value_type"

    # ── Process roles ────────────────────────────────────────────────────────
    PROCESS = "process"
    PROCESS_ROLE = "process_role"
    PROCESS_ROLE_HOLDER = "process_role_holder"

    # ── Review setup ─────────────────────────────────────────────────────────
    LANGUAGE_LEVEL = "language_level"
    REVIEW_DIMENSION = "review_dimension"
    REVIEW_DIMENSION_CRITERION = "review_dimension_criterion"
    REVIEW_LEVEL = "review_level"
    REVIEW_LEVEL_REQUIREMENT = "review_level_requirement"


class PlanSessionStatusKey(str, Enum):
    PENDING = "pending"
    OPEN = "open"
    CLOSED = "closed"


class ReviewSessionStatusKey(str, Enum):
    PENDING = "pending"
    OPEN = "open"
    CLOSED = "closed"


PLAN_SESSION_ACTIVE_STATUS_KEYS = frozenset(
    {PlanSessionStatusKey.PENDING.value, PlanSessionStatusKey.OPEN.value}
)

REVIEW_SESSION_ACTIVE_STATUS_KEYS = frozenset(
    {ReviewSessionStatusKey.PENDING.value, ReviewSessionStatusKey.OPEN.value}
)


class PlanningJobGroupName(str, Enum):
    PLANNING = "planning"
