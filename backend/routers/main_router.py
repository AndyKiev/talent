from fastapi import APIRouter

# Access testing ("test as group")
from backend.api_v1.access_test_context.access_test_context_views import (
    router as access_test_context_router,
)
from backend.api_v1.app_setting.app_setting_views import (
    router as app_setting_router,
)
from backend.api_v1.audit.change_log.change_log_views import (
    router as change_log_router,
)

# Audit change-log subsystem (ported from talent-test)
from backend.api_v1.audit.change_session.change_session_views import (
    router as change_session_router,
)
from backend.api_v1.recruitment_candidate.recruitment_candidate_views import (
    router as candidate_router,
)
from backend.api_v1.recruitment_application.recruitment_application_views import (
    router as candidate_application_router,
)
from backend.api_v1.recruitment_candidate_note.recruitment_candidate_note_views import (
    router as candidate_note_router,
)
from backend.api_v1.recruitment_candidate_source.recruitment_candidate_source_views import (
    router as candidate_source_router,
)

# Developer tools — live DB table browser
from backend.api_v1.db_table_info.db_table_info_views import (
    router as db_table_info_router,
)
from backend.api_v1.department.department_views import router as department_router
from backend.api_v1.department_category.department_category_views import (
    router as department_category_router,
)
from backend.api_v1.department_job_target.department_job_target_views import (
    router as department_job_target_router,
)
from backend.api_v1.department_region_link.department_region_link_views import (
    router as department_region_link_router,
)
from backend.api_v1.department_type.department_type_views import (
    router as department_type_router,
)
from backend.api_v1.department_type_job_link.department_type_job_link_views import (
    router as department_type_job_link_router,
)
from backend.api_v1.department_type_parental_links import (
    router as dept_type_parental_link_router,
)
from backend.api_v1.education_degree.education_degree_views import (
    router as education_degree_router,
)
from backend.api_v1.employee.employee_views import router as employee_router
from backend.api_v1.employee_child.employee_child_views import (
    router as employee_child_router,
)
from backend.api_v1.employee_department.employee_department_views import (
    router as employee_department_router,
)
from backend.api_v1.employee_development_vision.employee_development_vision_views import (
    router as employee_development_vision_router,
)
from backend.api_v1.employee_education.employee_education_views import (
    router as employee_education_router,
)
from backend.api_v1.employee_events.employee_event.employee_event_views import (
    router as employee_event_router,
)
from backend.api_v1.employee_events.employee_event_change.employee_event_change_views import (
    router as employee_event_change_router,
)
from backend.api_v1.employee_events.employee_event_direction_type.employee_event_direction_type_views import (
    router as employee_event_direction_type_router,
)
from backend.api_v1.employee_events.employee_event_status.employee_event_status_views import (
    router as employee_event_status_router,
)
from backend.api_v1.employee_events.employee_event_type.employee_event_type_views import (
    router as employee_event_type_router,
)
from backend.api_v1.employee_events.employee_event_type_direction.employee_event_type_direction_views import (
    router as employee_event_type_direction_router,
)
from backend.api_v1.employee_language_profile.employee_language_profile_views import (
    router as employee_language_profile_router,
)
from backend.api_v1.employee_mission.employee_mission_views import (
    router as employee_mission_router,
)
from backend.api_v1.employee_mission_comment.employee_mission_comment_views import (
    router as employee_mission_comment_router,
)
from backend.api_v1.employee_mission_dimension_link.employee_mission_dimension_link_views import (
    router as employee_mission_dimension_link_router,
)
from backend.api_v1.employee_mission_kpi.employee_mission_kpi_views import (
    router as employee_mission_kpi_router,
)

# Employee development missions (employee-scoped development plan).
from backend.api_v1.employee_mission_status.employee_mission_status_views import (
    router as employee_mission_status_router,
)
from backend.api_v1.employee_photo.employee_photo_views import (
    router as employee_photo_router,
)

# Recommended trainings — employee-scoped development advice, independent of the
# training module (works with it switched off).
from backend.api_v1.employee_recommended_training.employee_recommended_training_views import (
    router as employee_recommended_training_router,
)
from backend.api_v1.employee_responsibility_department.employee_responsibility_department_views import (
    router as employee_responsibility_department_router,
)
from backend.api_v1.employee_status.employee_status_views import (
    router as employee_status_router,
)
from backend.api_v1.employee_training.employee_training_views import (
    router as employee_training_router,
)
from backend.api_v1.employee_training_status.employee_training_status_views import (
    router as employee_training_status_router,
)
from backend.api_v1.employee_user_group_link.employee_user_group_link_views import (
    router as employee_user_group_link_router,
)
from backend.api_v1.essence.essence_views import router as essence_router
from backend.api_v1.hrm_scope.hrm_scope_views import router as hrm_scope_router
from backend.api_v1.recruitment_interview.recruitment_interview_views import (
    router as interview_router,
)
from backend.api_v1.recruitment_interview_feedback.recruitment_interview_feedback_views import (
    router as interview_feedback_router,
)
from backend.api_v1.job.job_views import router as job_router
from backend.api_v1.job_category.job_category_views import (
    router as job_category_router,
)
from backend.api_v1.job_group.job_group_views import router as job_group_router

# New modules from talent-work
from backend.api_v1.job_group_type.job_group_type_views import (
    router as job_group_type_router,
)
from backend.api_v1.job_job_category_link.job_job_category_link_views import (
    router as job_job_category_link_router,
)
from backend.api_v1.job_job_group_link.job_job_group_link_views import (
    router as job_job_group_link_router,
)
from backend.api_v1.job_process_role_link.job_process_role_link_views import (
    router as job_process_role_link_router,
)
from backend.api_v1.job_requirement_group.job_requirement_group_views import (
    router as job_requirement_group_router,
)
from backend.api_v1.job_requirement_item.job_requirement_item_views import (
    router as job_requirement_item_router,
)
from backend.api_v1.lang.lang_views import router as lang_router

# Foreign languages
from backend.api_v1.language_level.language_level_views import (
    router as language_level_router,
)
from backend.api_v1.menu.menu_views import router as menu_router
from backend.api_v1.msg_bulk.msg_bulk_views import router as msg_bulk_router
from backend.api_v1.msg_full.msg_full_views import router as msg_full_router
from backend.api_v1.msg_key.msg_key_views import router as msg_key_router
from backend.api_v1.msg_pg.msg_views import router as msg_router
from backend.api_v1.notifications.notification_views import (
    router as notifications_router,
)
from backend.api_v1.operation.operation_views import router as operation_router
from backend.api_v1.operation_essence_set_link.operation_essence_set_link_views import (
    router as operation_essence_set_link_router,
)

# Auth model (ported from talent-test) — employee-based permissions
from backend.api_v1.permission_manifest.permission_manifest_views import (
    router as permission_manifest_router,
)
from backend.api_v1.person.person_views import router as person_router
from backend.api_v1.recruitment_application_status.recruitment_application_status_views import (
    router as pipeline_status_router,
)
from backend.api_v1.planning.plan_category_default.plan_category_default_views import (
    router as plan_category_default_router,
)
from backend.api_v1.planning.plan_matrix.plan_matrix_views import (
    router as plan_matrix_router,
)
from backend.api_v1.planning.plan_report.plan_report_views import (
    router as plan_report_router,
)
from backend.api_v1.planning.plan_scope.plan_scope_views import (
    router as plan_scope_router,
)
from backend.api_v1.planning.plan_scope_default.plan_scope_default_views import (
    router as plan_scope_default_router,
)
from backend.api_v1.planning.plan_session.plan_session_views import (
    router as plan_session_router,
)

# Planning
from backend.api_v1.planning.plan_session_status.plan_session_status_views import (
    router as plan_session_status_router,
)
from backend.api_v1.process_roles.oversight_assignment.oversight_assignment_views import (
    router as oversight_assignment_router,
)
from backend.api_v1.process_roles.oversight_manager.oversight_manager_views import (
    router as oversight_manager_router,
)

# Process roles
from backend.api_v1.process_roles.process.process_views import (
    router as process_router,
)
from backend.api_v1.process_roles.process_role.process_role_views import (
    router as process_role_router,
)
from backend.api_v1.process_roles.process_role_active_context.process_role_active_context_views import (
    router as process_role_active_context_router,
)
from backend.api_v1.process_roles.process_role_holder.process_role_holder_views import (
    router as process_role_holder_router,
)
from backend.api_v1.process_roles.process_role_holder_department_link.process_role_holder_department_link_views import (
    router as process_role_holder_department_link_router,
)
from backend.api_v1.process_roles.process_role_holder_employee_link.process_role_holder_employee_link_views import (
    router as process_role_holder_employee_link_router,
)

# Recruitment
from backend.api_v1.recruitment_dimension.recruitment_dimension_views import (
    router as recruitment_dimension_router,
)
from backend.api_v1.recruitment_task.recruitment_task_views import (
    router as recruitment_task_router,
)
from backend.api_v1.recruitment_task_status.recruitment_task_status_views import (
    router as recruitment_task_status_router,
)

# Regions (ported from talent-test)
from backend.api_v1.region.region_views import router as region_router
from backend.api_v1.review_dimension.review_dimension_views import (
    router as review_dimension_router,
)
from backend.api_v1.review_dimension_criteria.review_dimension_criteria_views import (
    router as review_dimension_criteria_router,
)
from backend.api_v1.review_level.review_level_views import router as review_level_router
from backend.api_v1.review_level_requirement.review_level_requirement_views import (
    router as review_level_requirement_router,
)
from backend.api_v1.review_session.review_session_views import (
    router as review_session_router,
)

# Review session department filter
from backend.api_v1.review_session_department.review_session_department_views import (
    router as review_session_department_router,
)
from backend.api_v1.review_session_employee.review_session_employee_views import (
    router as review_session_employee_router,
)
from backend.api_v1.review_session_employee_comment.review_session_employee_comment_views import (
    router as review_session_employee_comment_router,
)

# Employee facts — the numbered lines under a competence, plus the pool of
# facts registered before a competence was chosen. The kind lookup is read-only.
from backend.api_v1.employee_fact.employee_fact_views import (
    router as employee_fact_router,
)
from backend.api_v1.employee_fact_type.employee_fact_type_views import (
    router as employee_fact_type_router,
)

# Competence summary — the strong / to-develop side lookup (read-only).
from backend.api_v1.review_session_employee_dimension_type.review_session_employee_dimension_type_views import (
    router as review_session_employee_dimension_type_router,
)
from backend.api_v1.review_session_employee_evaluation.review_session_employee_evaluation_views import (
    router as review_evaluation_router,
)
from backend.api_v1.review_session_employee_feedback_type.review_session_employee_feedback_type_views import (
    router as review_session_employee_feedback_type_router,
)
from backend.api_v1.review_session_employee_level.review_session_employee_level_views import (
    router as review_session_employee_level_router,
)

# Review-record lookups: the lifecycle status and the feedback voices. Read-only
# (their keys are a code contract), so no admin CRUD router.
from backend.api_v1.review_session_employee_status.review_session_employee_status_views import (
    router as review_session_employee_status_router,
)
from backend.api_v1.review_session_status.review_session_status_views import (
    router as review_session_status_router,
)

# App settings (typed key/value)
from backend.api_v1.setting_value_type.setting_value_type_views import (
    router as setting_value_type_router,
)
from backend.api_v1.talent_audit.talent_audit_views import router as talent_audit_router
from backend.api_v1.talent_audit_interview.talent_audit_interview_views import (
    router as talent_audit_interview_router,
)
from backend.api_v1.talent_audit_interview_job.talent_audit_interview_job_views import (
    router as talent_audit_interview_job_router,
)
from backend.api_v1.talent_audit_interview_status.talent_audit_interview_status_views import (
    router as talent_audit_interview_status_router,
)
from backend.api_v1.talent_audit_job.talent_audit_job_views import (
    router as talent_audit_job_router,
)
from backend.api_v1.talent_audit_job_status.talent_audit_job_status_views import (
    router as talent_audit_job_status_router,
)
from backend.api_v1.talent_audit_status.talent_audit_status_views import (
    router as talent_audit_status_router,
)
from backend.api_v1.talent_period.talent_period_views import (
    router as talent_period_router,
)
from backend.api_v1.talent_status.talent_status_views import (
    router as talent_status_router,
)
from backend.api_v1.talent_status_period_link.talent_status_period_link_views import (
    router as talent_status_period_link_router,
)
from backend.api_v1.training_category.training_category_views import (
    router as training_category_router,
)

# Training
from backend.api_v1.training_link_type.training_link_type_views import (
    router as training_link_type_router,
)
from backend.api_v1.training_type.training_type_views import (
    router as training_type_router,
)
from backend.api_v1.training_type_job_category_link.training_type_job_category_link_views import (
    router as training_type_job_category_link_router,
)
from backend.api_v1.training_type_job_link.training_type_job_link_views import (
    router as training_type_job_link_router,
)
from backend.api_v1.user_group.user_group_views import router as user_group_router
from backend.api_v1.user_group_type.user_group_type_views import (
    router as user_group_type_router,
)
from backend.api_v1.user_setting.user_setting_views import (
    router as user_setting_router,
)
from backend.auth.jwt_auth import router as auth_router
from backend.config.config import settings

router = APIRouter(prefix=settings.api_v1_prefix)

router.include_router(auth_router)
router.include_router(lang_router)
router.include_router(talent_status_router)
router.include_router(talent_period_router)
router.include_router(talent_status_period_link_router)
router.include_router(talent_audit_status_router)
router.include_router(talent_audit_router)
router.include_router(talent_audit_job_status_router)
router.include_router(talent_audit_job_router)
router.include_router(talent_audit_interview_status_router)
router.include_router(talent_audit_interview_router)
router.include_router(department_router)
router.include_router(department_type_router)
router.include_router(dept_type_parental_link_router)
router.include_router(department_type_job_link_router)
router.include_router(department_job_target_router)
router.include_router(department_category_router)
router.include_router(job_router)
router.include_router(person_router)
router.include_router(employee_router)
router.include_router(employee_department_router)
router.include_router(employee_responsibility_department_router)
router.include_router(menu_router)
router.include_router(employee_status_router)
router.include_router(operation_router)
router.include_router(user_group_router)
router.include_router(user_group_type_router)
router.include_router(msg_key_router)
router.include_router(msg_router)
router.include_router(msg_full_router)
router.include_router(msg_bulk_router)
router.include_router(employee_event_status_router)
router.include_router(employee_event_type_router)
router.include_router(employee_event_direction_type_router)
router.include_router(employee_event_router, prefix="/employees")
router.include_router(employee_event_change_router, prefix="/employees")
router.include_router(
    employee_event_type_direction_router, prefix="/employee_event_types"
)
router.include_router(notifications_router)
router.include_router(review_dimension_router)
router.include_router(review_dimension_criteria_router)
router.include_router(review_session_router)
router.include_router(review_session_status_router)
router.include_router(review_session_employee_router)
router.include_router(review_evaluation_router)
router.include_router(review_level_router)
router.include_router(review_level_requirement_router)
router.include_router(education_degree_router)
router.include_router(employee_education_router)
router.include_router(employee_child_router)
router.include_router(employee_photo_router)
router.include_router(review_session_employee_level_router)
router.include_router(review_session_employee_comment_router)

# New modules from talent-work
router.include_router(job_group_type_router)
router.include_router(job_group_router)
router.include_router(job_job_group_link_router)
router.include_router(job_process_role_link_router)
router.include_router(job_category_router)
router.include_router(job_job_category_link_router)
router.include_router(essence_router)
router.include_router(operation_essence_set_link_router)
router.include_router(talent_audit_interview_job_router)

# Planning
router.include_router(plan_session_status_router)
router.include_router(plan_session_router)
router.include_router(plan_category_default_router)
router.include_router(plan_scope_default_router)
router.include_router(plan_scope_router)
router.include_router(plan_report_router)
router.include_router(plan_matrix_router)

# Foreign languages
router.include_router(language_level_router)
router.include_router(employee_language_profile_router)

# Process roles
router.include_router(process_router)
router.include_router(process_role_router)
router.include_router(process_role_holder_router)
router.include_router(process_role_holder_employee_link_router)
router.include_router(process_role_holder_department_link_router)
router.include_router(process_role_active_context_router)
router.include_router(oversight_manager_router)
router.include_router(oversight_assignment_router)
router.include_router(access_test_context_router)

# App settings (typed key/value)
router.include_router(setting_value_type_router)
router.include_router(app_setting_router)
router.include_router(user_setting_router)

# Regions (ported from talent-test)
router.include_router(region_router)
router.include_router(department_region_link_router)

# Audit change-log subsystem (ported from talent-test)
router.include_router(change_session_router)
router.include_router(change_log_router)

# Auth model (ported from talent-test)
router.include_router(permission_manifest_router)
router.include_router(employee_user_group_link_router)
router.include_router(hrm_scope_router)

# Developer tools — live DB table browser
router.include_router(db_table_info_router)

# Review session department filter
router.include_router(review_session_department_router)

# Training
router.include_router(training_link_type_router)
router.include_router(training_category_router)
router.include_router(employee_training_status_router)
router.include_router(training_type_router)
router.include_router(training_type_job_link_router)
router.include_router(training_type_job_category_link_router)
router.include_router(employee_training_router)

# Recruitment
router.include_router(recruitment_dimension_router)
router.include_router(recruitment_task_status_router)
router.include_router(job_requirement_group_router)
router.include_router(job_requirement_item_router)
router.include_router(recruitment_task_router)
router.include_router(candidate_source_router)
router.include_router(pipeline_status_router)
router.include_router(candidate_router)
router.include_router(candidate_note_router)
router.include_router(candidate_application_router)
router.include_router(interview_router)
router.include_router(interview_feedback_router)

router.include_router(review_session_employee_dimension_type_router)

router.include_router(employee_fact_type_router)
router.include_router(employee_fact_router)

router.include_router(review_session_employee_status_router)
router.include_router(review_session_employee_feedback_type_router)

router.include_router(employee_recommended_training_router)

router.include_router(employee_mission_status_router)
router.include_router(employee_mission_router)
router.include_router(employee_mission_kpi_router)
router.include_router(employee_mission_dimension_link_router)
router.include_router(employee_mission_comment_router)
router.include_router(employee_development_vision_router)
