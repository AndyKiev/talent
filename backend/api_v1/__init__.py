__all__ = {
    "Lang",
    "Msg",
    "MsgKey",
    "Job",
    "Employee",
    "UserGroup",
    "UserGroupType",
    "Operation",
    "EmployeeStatus",
    "EmployeeUserGroupLink",
    "EmployeeCurrentLevel",
    "EmployeePersonalData",
    "JobUserGroupLink",
    "OperationUserGroupLink",
    "Department",
    "DepartmentType",
    "DepartmentCategory",
    "TalentStatusPeriodLink",
    "TalentStatus",
    "TalentPeriod",
    "EmployeeDepartment",
    "TalentAuditStatus",
    "TalentAudit",
    "TalentAuditJobStatus",
    "TalentAuditJob",
    "TalentAuditInterviewStatus",
    "TalentAuditInterview",
    # Employee event history
    "EmployeeEventDirectionType",
    "EmployeeEventType",
    "EmployeeEventTypeDirection",
    "EmployeeEventStatus",
    "EmployeeEvent",
    "EmployeeEventChange",
    "EmployeeEventChangeDeptType",
    "EmployeeEventChangeDepartment",
    "DepartmentTypeParentalLink",
    # Essence-set access control
    "Essence",
    "OperationEssenceLink",
    "UserGroupOperationEssenceLink",
    "EssenceSet",
    "EssenceSetMember",
    "OperationEssenceSetLink",
    "UserGroupOperationEssenceSetLink",
    # Jobs / talent audit additions
    "TalentAuditInterviewJob",
    "JobGroupType",
    "JobGroup",
    "JobJobGroupLink",
    "JobResponsibilityCategoryLink",
    # Planning
    "PlanSessionStatus",
    "PlanSession",
    "PlanCategoryDefault",
    "PlanSessionCategory",
    "PlanScopeDefault",
    "PlanScope",
    # People review
    "ReviewDimension",
    "ReviewDimensionCriteria",
    "ReviewSession",
    "ReviewSessionEmployee",
    "ReviewSessionEmployeeEvaluation",
    "ReviewSessionEmployeeCriterionScore",
    # People review — competency levels
    "ReviewLevel",
    "ReviewLevelRequirement",
    "ReviewSessionEmployeeLevel",
    "ReviewSessionEmployeeLevelAnswer",
    # Foreign languages
    "LanguageLevel",
    "EmployeeLanguageProfile",
    "EmployeeLanguage",
    # Education
    "EducationDegree",
    "EmployeeEducation",
    # Children
    "EmployeeChild",
    # Photo
    "EmployeePhoto",
}

from backend.api_v1.lang.lang_model import Lang
from backend.api_v1.msg_pg.msg_model import Msg
from backend.api_v1.msg_key.msg_key_model import MsgKey
from backend.api_v1.job.job_model import Job
from backend.api_v1.employee.employee_model import Employee
from backend.api_v1.user_group.user_group_model import UserGroup
from backend.api_v1.user_group_type.user_group_type_model import UserGroupType
from backend.api_v1.operation.operation_model import Operation
from backend.api_v1.employee_status.employee_status_model import EmployeeStatus
from backend.api_v1.department.department_model import Department
from backend.api_v1.department_type.department_type_model import DepartmentType
from backend.api_v1.department_type_job_link.department_type_job_link_model import DepartmentTypeJobLink

from backend.api_v1.department_type_parental_links.department_type_parental_link_model import DepartmentTypeParentalLink
from backend.api_v1.department_category.department_category_model import DepartmentCategory

from backend.api_v1.talent_status_period_link.talent_status_period_link_model import TalentStatusPeriodLink
from backend.api_v1.talent_status.talent_status_model import TalentStatus
from backend.api_v1.talent_period.talent_period_model import TalentPeriod

from backend.api_v1.employee_department.employee_department_model import EmployeeDepartment
from backend.api_v1.talent_audit_status.talent_audit_status_model import TalentAuditStatus
from backend.api_v1.talent_audit.talent_audit_model import TalentAudit
from backend.api_v1.talent_audit_job_status.talent_audit_job_status_model import TalentAuditJobStatus
from backend.api_v1.talent_audit_job.talent_audit_job_model import TalentAuditJob
from backend.api_v1.talent_audit_interview_status.talent_audit_interview_status_model import TalentAuditInterviewStatus
from backend.api_v1.talent_audit_interview.talent_audit_interview_model import TalentAuditInterview

from backend.api_v1.table_relationship_links.employee_user_group_link_model import (
    EmployeeUserGroupLink,
)
from backend.api_v1.table_relationship_links.employee_current_level_model import (
    EmployeeCurrentLevel,
)
from backend.api_v1.table_relationship_links.employee_personal_data_model import (
    EmployeePersonalData,
)
from backend.api_v1.table_relationship_links.job_user_group_link_model import (
    JobUserGroupLink,
)
from backend.api_v1.table_relationship_links.operation_user_group_link_model import (
    OperationUserGroupLink,
)

# Employee event history — import order matters: lookups first, then
# composites that reference them, then the multi-valued leaf table.
from backend.api_v1.employee_events.employee_event_direction_type.employee_event_direction_type_model import (
    EmployeeEventDirectionType,
)
from backend.api_v1.employee_events.employee_event_type.employee_event_type_model import EmployeeEventType
from backend.api_v1.employee_events.employee_event_type_direction.employee_event_type_direction_model import (
    EmployeeEventTypeDirection,
)
# EmployeeEventStatus must be imported before EmployeeEvent (FK dependency)
from backend.api_v1.employee_events.employee_event_status.employee_event_status_model import EmployeeEventStatus
from backend.api_v1.employee_events.employee_event.employee_event_model import EmployeeEvent
from backend.api_v1.employee_events.employee_event_change.employee_event_change_model import EmployeeEventChange

from backend.api_v1.employee_events.employee_event_change_dept_type.employee_event_change_dept_type_model import (
    EmployeeEventChangeDeptType,
)
from backend.api_v1.employee_events.employee_event_change_department.employee_event_change_department_model import (
    EmployeeEventChangeDepartment,
)

# ── Essence-set access control & job/audit additions ──────────────────────────
from backend.api_v1.talent_audit_interview_job.talent_audit_interview_job_model import TalentAuditInterviewJob
from backend.api_v1.job_group_type.job_group_type_model import JobGroupType
from backend.api_v1.job_group.job_group_model import JobGroup
from backend.api_v1.job_job_group_link.job_job_group_link_model import JobJobGroupLink

from backend.api_v1.operation_essence_link.operation_essence_link_model import OperationEssenceLink
from backend.api_v1.essence.essence_model import Essence
from backend.api_v1.table_relationship_links.user_group_operation_essence_link_model import UserGroupOperationEssenceLink
from backend.api_v1.job_responsibility_category_link.job_responsibility_category_link_model import JobResponsibilityCategoryLink

from backend.api_v1.essence_set.essence_set_model import EssenceSet
from backend.api_v1.essence_set.essence_set_member_model import EssenceSetMember
from backend.api_v1.operation_essence_set_link.operation_essence_set_link_model import (
    OperationEssenceSetLink,
)
from backend.api_v1.table_relationship_links.user_group_operation_essence_set_link_model import (
    UserGroupOperationEssenceSetLink,
)

# Planning — import order matters: status (lookup) first, then the session,
# then defaults, then the per-session snapshot tables that FK into them.
from backend.api_v1.planning.plan_session_status.plan_session_status_model import PlanSessionStatus
from backend.api_v1.planning.plan_session.plan_session_model import PlanSession
from backend.api_v1.planning.plan_category_default.plan_category_default_model import PlanCategoryDefault
from backend.api_v1.planning.plan_session_category.plan_session_category_model import PlanSessionCategory
from backend.api_v1.planning.plan_scope_default.plan_scope_default_model import PlanScopeDefault
from backend.api_v1.planning.plan_scope.plan_scope_model import PlanScope

# People review — dimension (lookup) + criteria, session, per-employee, evaluation.
from backend.api_v1.review_dimension.review_dimension_model import ReviewDimension
from backend.api_v1.review_dimension_criteria.review_dimension_criteria_model import (
    ReviewDimensionCriteria,
)
from backend.api_v1.review_session.review_session_model import ReviewSession
from backend.api_v1.review_session_employee.review_session_employee_model import (
    ReviewSessionEmployee,
)
from backend.api_v1.review_session_employee_evaluation.review_session_employee_evaluation_model import (
    ReviewSessionEmployeeEvaluation,
)
from backend.api_v1.review_session_employee_criterion_score.review_session_employee_criterion_score_model import (
    ReviewSessionEmployeeCriterionScore,
)

# People review — competency levels: level (parent) + requirements (child),
# then the per-rse registration and its per-requirement answers.
from backend.api_v1.review_level.review_level_model import ReviewLevel
from backend.api_v1.review_level_requirement.review_level_requirement_model import (
    ReviewLevelRequirement,
)
from backend.api_v1.review_session_employee_level.review_session_employee_level_model import (
    ReviewSessionEmployeeLevel,
)
from backend.api_v1.review_session_employee_level_answer.review_session_employee_level_answer_model import (
    ReviewSessionEmployeeLevelAnswer,
)

# Foreign languages — lookup first, then the one-to-one profile, then the leaf rows.
from backend.api_v1.language_level.language_level_model import LanguageLevel
from backend.api_v1.employee_language_profile.employee_language_profile_model import (
    EmployeeLanguageProfile,
)
from backend.api_v1.employee_language.employee_language_model import EmployeeLanguage

# Education — degree lookup first, then the per-employee education rows.
from backend.api_v1.education_degree.education_degree_model import EducationDegree
from backend.api_v1.employee_education.employee_education_model import EmployeeEducation

# Children — per-employee child rows (1:N), birth date only.
from backend.api_v1.employee_child.employee_child_model import EmployeeChild

# Photo — per-employee profile photo (1:1), downscaled blob, ON DELETE CASCADE.
from backend.api_v1.employee_photo.employee_photo_model import EmployeePhoto
