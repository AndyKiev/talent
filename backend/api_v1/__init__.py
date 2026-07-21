__all__ = {
    "Lang",
    "Msg",
    "MsgKey",
    "Job",
    "Sex",
    "MaritalStatus",
    "Person",
    "EmployeeOrigin",
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
    "MenuUserGroupLink",
    "AppSettingUserGroupLink",
    "Department",
    "DepartmentType",
    "DepartmentCategory",
    "TalentStatusPeriodLink",
    "TalentStatus",
    "TalentPeriod",
    "EmployeeDepartment",
    "EmployeeResponsibilityDepartment",
    "Menu",
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
    "EmployeeEventChangeDepartment",
    "DepartmentTypeParentalLink",
    "DepartmentJobTarget",
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
    "JobProcessRoleLink",
    "JobProcessRoleLinkDepartmentType",
    "JobCategory",
    "JobJobCategoryLink",
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
    "ReviewSessionStatus",
    "ReviewSessionCriterion",
    "ReviewSessionSetting",
    "ReviewSessionLevel",
    "ReviewSessionLevelRequirement",
    "ReviewSessionEmployee",
    "ReviewSessionEmployeeEvaluation",
    "ReviewSessionEmployeeCriterionScore",
    "ReviewSessionEmployeeComment",
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
    # Process roles
    "Process",
    "ProcessRole",
    "ProcessRoleHolder",
    "ProcessRoleHolderEmployeeLink",
    "ProcessRoleHolderDepartmentLink",
    "ProcessRoleActiveContext",
    "AccessTestContext",
    # App settings (typed key/value)
    "SettingValueType",
    "AppSetting",
    "UserSetting",
    # Regions (ported from talent-test)
    "Region",
    "DepartmentRegionLink",
    # Audit change-log subsystem (ported from talent-test)
    "ChangeSession",
    "ChangeLog",
    # HRM scope (ported from talent-test)
    "HrmScope",
    # Review session — department filter
    "ReviewSessionDepartment",
    # Training
    "TrainingLinkType",
    "TrainingCategory",
    "EmployeeTrainingStatus",
    "TrainingType",
    "TrainingTypeJobLink",
    "TrainingTypeJobCategoryLink",
    "EmployeeTraining",
    # Recruitment
    "RecruitmentDimension",
    "RecruitmentTaskStatus",
    "JobRequirementGroup",
    "JobRequirementItem",
    "RecruitmentTask",
    # Candidates / hiring pipeline
    "CandidateSource",
    "PipelineStatus",
    "Candidate",
    "CandidatePhone",
    "CandidateNote",
    "CandidateApplication",
    "ApplicationStatusHistory",
    "Interview",
    "InterviewInterviewer",
    "InterviewFeedback",
    # Employee development missions (employee-scoped development plan)
    "EmployeeMission",
    "EmployeeMissionKpi",
    "EmployeeMissionDimensionLink",
    "EmployeeMissionComment",
    "EmployeeDevelopmentVision",
}

from backend.api_v1.lang.lang_model import Lang
from backend.api_v1.msg_pg.msg_model import Msg
from backend.api_v1.msg_key.msg_key_model import MsgKey
from backend.api_v1.job.job_model import Job

# FK-target order: sexes/marital_statuses -> persons -> employee_origins -> employees.
from backend.api_v1.sex.sex_model import Sex
from backend.api_v1.marital_status.marital_status_model import MaritalStatus
from backend.api_v1.person.person_model import Person
from backend.api_v1.employee_origin.employee_origin_model import EmployeeOrigin
from backend.api_v1.employee.employee_model import Employee
from backend.api_v1.user_group.user_group_model import UserGroup
from backend.api_v1.user_group_type.user_group_type_model import UserGroupType
from backend.api_v1.operation.operation_model import Operation
from backend.api_v1.employee_status.employee_status_model import EmployeeStatus
from backend.api_v1.department.department_model import Department
from backend.api_v1.department_type.department_type_model import DepartmentType
from backend.api_v1.department_type_job_link.department_type_job_link_model import (
    DepartmentTypeJobLink,
)

from backend.api_v1.department_type_parental_links.department_type_parental_link_model import (
    DepartmentTypeParentalLink,
)

# Effective-dated headcount targets — FKs into departments + department_type_job_links.
from backend.api_v1.department_job_target.department_job_target_model import (
    DepartmentJobTarget,
)
from backend.api_v1.department_category.department_category_model import (
    DepartmentCategory,
)

from backend.api_v1.talent_status_period_link.talent_status_period_link_model import (
    TalentStatusPeriodLink,
)
from backend.api_v1.talent_status.talent_status_model import TalentStatus
from backend.api_v1.talent_period.talent_period_model import TalentPeriod

from backend.api_v1.employee_department.employee_department_model import (
    EmployeeDepartment,
)
from backend.api_v1.employee_responsibility_department.employee_responsibility_department_model import (
    EmployeeResponsibilityDepartment,
)
from backend.api_v1.menu.menu_model import Menu
from backend.api_v1.talent_audit_status.talent_audit_status_model import (
    TalentAuditStatus,
)
from backend.api_v1.talent_audit.talent_audit_model import TalentAudit
from backend.api_v1.talent_audit_job_status.talent_audit_job_status_model import (
    TalentAuditJobStatus,
)
from backend.api_v1.talent_audit_job.talent_audit_job_model import TalentAuditJob
from backend.api_v1.talent_audit_interview_status.talent_audit_interview_status_model import (
    TalentAuditInterviewStatus,
)
from backend.api_v1.talent_audit_interview.talent_audit_interview_model import (
    TalentAuditInterview,
)

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
from backend.api_v1.table_relationship_links.menu_user_group_link_model import (
    MenuUserGroupLink,
)
from backend.api_v1.table_relationship_links.app_setting_user_group_link_model import (
    AppSettingUserGroupLink,
)

# Employee event history — import order matters: lookups first, then
# composites that reference them, then the multi-valued leaf table.
from backend.api_v1.employee_events.employee_event_direction_type.employee_event_direction_type_model import (
    EmployeeEventDirectionType,
)
from backend.api_v1.employee_events.employee_event_type.employee_event_type_model import (
    EmployeeEventType,
)
from backend.api_v1.employee_events.employee_event_type_direction.employee_event_type_direction_model import (
    EmployeeEventTypeDirection,
)

# EmployeeEventStatus must be imported before EmployeeEvent (FK dependency)
from backend.api_v1.employee_events.employee_event_status.employee_event_status_model import (
    EmployeeEventStatus,
)
from backend.api_v1.employee_events.employee_event.employee_event_model import (
    EmployeeEvent,
)
from backend.api_v1.employee_events.employee_event_change.employee_event_change_model import (
    EmployeeEventChange,
)

from backend.api_v1.employee_events.employee_event_change_department.employee_event_change_department_model import (
    EmployeeEventChangeDepartment,
)

# ── Essence-set access control & job/audit additions ──────────────────────────
from backend.api_v1.talent_audit_interview_job.talent_audit_interview_job_model import (
    TalentAuditInterviewJob,
)
from backend.api_v1.job_group_type.job_group_type_model import JobGroupType
from backend.api_v1.job_group.job_group_model import JobGroup
from backend.api_v1.job_job_group_link.job_job_group_link_model import JobJobGroupLink
from backend.api_v1.job_process_role_link.job_process_role_link_model import (
    JobProcessRoleLink,
)
from backend.api_v1.job_process_role_link.job_process_role_link_department_type_model import (
    JobProcessRoleLinkDepartmentType,
)

# Job category (1:1 optional property via job_job_category_links) — category
# table first, then the link that FKs into it.
from backend.api_v1.job_category.job_category_model import JobCategory
from backend.api_v1.job_job_category_link.job_job_category_link_model import (
    JobJobCategoryLink,
)

from backend.api_v1.operation_essence_link.operation_essence_link_model import (
    OperationEssenceLink,
)
from backend.api_v1.essence.essence_model import Essence
from backend.api_v1.table_relationship_links.user_group_operation_essence_link_model import (
    UserGroupOperationEssenceLink,
)
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
from backend.api_v1.planning.plan_session_status.plan_session_status_model import (
    PlanSessionStatus,
)
from backend.api_v1.planning.plan_session.plan_session_model import PlanSession
from backend.api_v1.planning.plan_category_default.plan_category_default_model import (
    PlanCategoryDefault,
)
from backend.api_v1.planning.plan_session_category.plan_session_category_model import (
    PlanSessionCategory,
)
from backend.api_v1.planning.plan_scope_default.plan_scope_default_model import (
    PlanScopeDefault,
)
from backend.api_v1.planning.plan_scope.plan_scope_model import PlanScope

# People review — dimension (lookup) + criteria, session, per-employee, evaluation.
from backend.api_v1.review_dimension.review_dimension_model import ReviewDimension
from backend.api_v1.review_dimension_criteria.review_dimension_criteria_model import (
    ReviewDimensionCriteria,
)
from backend.api_v1.review_session.review_session_model import ReviewSession
from backend.api_v1.review_session_status.review_session_status_model import (
    ReviewSessionStatus,
)
from backend.api_v1.review_session_criterion.review_session_criterion_model import (
    ReviewSessionCriterion,
)
from backend.api_v1.review_session_setting.review_session_setting_model import (
    ReviewSessionSetting,
)
from backend.api_v1.review_session_level.review_session_level_model import (
    ReviewSessionLevel,
)
from backend.api_v1.review_session_level_requirement.review_session_level_requirement_model import (
    ReviewSessionLevelRequirement,
)
from backend.api_v1.review_session_employee.review_session_employee_model import (
    ReviewSessionEmployee,
)
from backend.api_v1.review_session_employee_evaluation.review_session_employee_evaluation_model import (
    ReviewSessionEmployeeEvaluation,
)
from backend.api_v1.review_session_employee_criterion_score.review_session_employee_criterion_score_model import (
    ReviewSessionEmployeeCriterionScore,
)
from backend.api_v1.review_session_employee_comment.review_session_employee_comment_model import (
    ReviewSessionEmployeeComment,
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

# Process roles — parents before children: process -> role -> holder -> leaf link.
from backend.api_v1.process_roles.process.process_model import Process
from backend.api_v1.process_roles.process_role.process_role_model import ProcessRole
from backend.api_v1.process_roles.process_role_holder.process_role_holder_model import (
    ProcessRoleHolder,
)
from backend.api_v1.process_roles.process_role_holder_employee_link.process_role_holder_employee_link_model import (
    ProcessRoleHolderEmployeeLink,
)
from backend.api_v1.process_roles.process_role_holder_department_link.process_role_holder_department_link_model import (
    ProcessRoleHolderDepartmentLink,
)
from backend.api_v1.process_roles.process_role_active_context.process_role_active_context_model import (
    ProcessRoleActiveContext,
)
from backend.api_v1.access_test_context.access_test_context_model import (
    AccessTestContext,
)

# App settings — value-type catalog first (FK target), then the settings table,
# then the per-user override table (FK -> app_settings).
from backend.api_v1.setting_value_type.setting_value_type_model import SettingValueType
from backend.api_v1.app_setting.app_setting_model import AppSetting
from backend.api_v1.user_setting.user_setting_model import UserSetting

# Regions (ported from talent-test) — region first, then the department link.
from backend.api_v1.region.region_model import Region
from backend.api_v1.department_region_link.department_region_link_model import (
    DepartmentRegionLink,
)

# Audit change-log subsystem (ported from talent-test) — session first, then log.
from backend.api_v1.audit.change_session.change_session_model import ChangeSession
from backend.api_v1.audit.change_log.change_log_model import ChangeLog

# HRM scope (ported from talent-test) — FK targets (employees, departments,
# employee_user_group_links) all already registered above.
from backend.api_v1.hrm_scope.hrm_scope_model import HrmScope

# Review session department filter — links a session to its filtered departments.
from backend.api_v1.review_session_department.review_session_department_model import (
    ReviewSessionDepartment,
)

# Training — lookups first (link_type, category, status), then training_type
# (FKs into training_category, training_link_type), then its job/job_category
# many-to-many link tables, then employee_training (FKs into employee,
# training_type, employee_training_status).
from backend.api_v1.training_link_type.training_link_type_model import TrainingLinkType
from backend.api_v1.training_category.training_category_model import TrainingCategory
from backend.api_v1.employee_training_status.employee_training_status_model import (
    EmployeeTrainingStatus,
)
from backend.api_v1.training_type.training_type_model import TrainingType
from backend.api_v1.training_type_job_link.training_type_job_link_model import (
    TrainingTypeJobLink,
)
from backend.api_v1.training_type_job_category_link.training_type_job_category_link_model import (
    TrainingTypeJobCategoryLink,
)
from backend.api_v1.employee_training.employee_training_model import EmployeeTraining

# Recruitment — dimension (lookup) + task status (lookup), then job requirement
# groups/items (FK into recruitment_dimensions), then recruitment_task (FKs into
# jobs, job_requirement_groups, recruitment_task_statuses, employees).
from backend.api_v1.recruitment_dimension.recruitment_dimension_model import (
    RecruitmentDimension,
)
from backend.api_v1.recruitment_task_status.recruitment_task_status_model import (
    RecruitmentTaskStatus,
)
from backend.api_v1.job_requirement_group.job_requirement_group_model import (
    JobRequirementGroup,
)
from backend.api_v1.job_requirement_item.job_requirement_item_model import (
    JobRequirementItem,
)
from backend.api_v1.recruitment_task.recruitment_task_model import RecruitmentTask

# Candidates / hiring pipeline — lookups first (candidate_source, pipeline_status),
# then candidate + its children (phone, note), then the per-task application row
# (FKs into candidates, recruitment_tasks, pipeline_statuses) and its status log.
from backend.api_v1.candidate_source.candidate_source_model import CandidateSource
from backend.api_v1.pipeline_status.pipeline_status_model import PipelineStatus
from backend.api_v1.candidate.candidate_model import Candidate
from backend.api_v1.candidate_phone.candidate_phone_model import CandidatePhone
from backend.api_v1.candidate_note.candidate_note_model import CandidateNote
from backend.api_v1.candidate_application.candidate_application_model import (
    CandidateApplication,
)
from backend.api_v1.application_status_history.application_status_history_model import (
    ApplicationStatusHistory,
)

# Interviews — the interview (FKs into candidate_applications, employees), then
# its interviewer links and feedback rows.
from backend.api_v1.interview.interview_model import Interview
from backend.api_v1.interview_interviewer.interview_interviewer_model import (
    InterviewInterviewer,
)
from backend.api_v1.interview_feedback.interview_feedback_model import (
    InterviewFeedback,
)

# Employee development missions — the host (employee_missions) first, then its
# children and the 1:1 competence link (FK into review_dimensions), then the
# employee-level development vision.
from backend.api_v1.employee_mission.employee_mission_model import EmployeeMission
from backend.api_v1.employee_mission_kpi.employee_mission_kpi_model import (
    EmployeeMissionKpi,
)
from backend.api_v1.employee_mission_dimension_link.employee_mission_dimension_link_model import (
    EmployeeMissionDimensionLink,
)
from backend.api_v1.employee_mission_comment.employee_mission_comment_model import (
    EmployeeMissionComment,
)
from backend.api_v1.employee_development_vision.employee_development_vision_model import (
    EmployeeDevelopmentVision,
)
