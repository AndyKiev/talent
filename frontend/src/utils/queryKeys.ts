export const DEPARTMENT_ROOTS_QK = ['department_roots'] as const;
export const DEPARTMENT_TREE_QK = ['department_tree'] as const;
export const DEPARTMENT_TYPE_CHILD_MAP_QK = ['department_type_child_map'] as const;
export const DEPARTMENT_FLAT_QK = ['departments_flat'] as const;
export const USER_GROUP_QK = ['user_groups'] as const;
export const USER_GROUP_TYPE_QK = ['user_group_types'] as const;
export const TALENT_STATUS_QK = ['talent_statuses'] as const;
export const TSPL_QK = ['talent_status_period_links'] as const;
export const TALENT_PERIOD_QK = ['talent_periods'] as const;
export const OPERATION_QK = ['operations'];
export const OESL_QK = ['operation_essence_set_links'];
export const USER_GROUPS_QK = ['user_groups'] as const;
export const JOB_QK = ['jobs'] as const;
export const JOB_GROUP_QK = ['job_groups'] as const;
export const JOB_GROUP_TYPE_QK = ['job_group_types'] as const;
export const JOB_CATEGORY_QK = ['job_categories'] as const;
export const JOB_PROCESS_ROLE_LINK_QK = (jobId: number) => ['job_process_role_links', jobId] as const;
export const ESSENCE_QK = ['essences'];
export const EMPLOYEE_EVENT_DIRECTION_TYPE_QK = ['employee_event_direction_types'] as const;
export const EMPLOYEE_EVENT_STATUS_QK = ['employee_event_statuses'] as const;
export const EMPLOYEE_EVENT_TYPE_QK = ['employee_event_types'] as const;
export const DEPARTMENT_CATEGORY_QK = ['department_categories'] as const;
export const PERSON_QK = ['persons'] as const;
export const DEPARTMENT_TYPE_QK = ['department_types'] as const;
export const PLAN_SESSION_QK = ['plan_sessions'] as const;
export const PLAN_SCOPE_QK = ['plan_scopes'] as const;
export const PLAN_SESSION_STATUS_QK = ['plan_session_statuses'] as const;
export const PLAN_CATEGORY_DEFAULT_QK = ['plan_category_defaults'] as const;
export const PLAN_SCOPE_DEFAULT_QK = ['plan_scope_defaults'] as const;
// Process roles
export const PROCESS_QK = ['processes'] as const;
export const PROCESS_ROLE_QK = ['process_roles'] as const;
export const PROCESS_ROLE_HOLDER_QK = ['process_role_holders'] as const;
export const PROCESS_ROLE_HOLDER_EMPLOYEE_QK = ['process_role_holder_employees'] as const;
export const PROCESS_ROLE_HOLDER_DEPARTMENT_QK = ['process_role_holder_departments'] as const;
export const PEOPLE_REVIEW_MY_SCOPES_QK = ['people_review_my_scopes'] as const;
export const PEOPLE_REVIEW_MY_LATEST_QK = ['people_review_my_latest'] as const;
export const SESSION_DEPARTMENTS_QK = (sessionId: number) => ['session_departments', sessionId] as const;
export const OVERSIGHT_MANAGER_OPTIONS_QK = ['oversight_manager_options'] as const;
export const MY_OVERSIGHT_MANAGER_QK = ['my_oversight_manager'] as const;
// Dynamic main-navigation menus
export const MENUS_MY_QK = ['menus_my'] as const;
export const MENUS_ALL_QK = ['menus_all'] as const;
// Developer menu editor (full list with visibility config)
export const MENUS_MANAGE_QK = ['menus_manage'] as const;
// App settings (typed key/value)
export const APP_SETTINGS_QK = ['app_settings'] as const;
export const SETTING_VALUE_TYPES_QK = ['setting_value_types'] as const;
// Prefix for every per-key setting query — invalidate it to refresh all
// useAppSetting/useBooleanSetting consumers after a setting changes.
export const APP_SETTING_BY_KEY_QK = ['app_setting_by_key'] as const;
// Per-user resolved settings (one shared query the consumer hooks read).
// Invalidate after editing a global setting OR a personal override.
export const EFFECTIVE_SETTINGS_QK = ['app_settings_effective_for_me'] as const;
// User-facing /settings page payload (overridable settings + this user's value).
export const USER_SETTINGS_EFFECTIVE_QK = ['user_settings_effective'] as const;

// ── Ported from talent-test (regions, hrm scopes, links) ──────────────────────
export const DEPARTMENT_REGION_LINK_QK = ['department_region_links'] as const;
export const DEPT_TYPE_JOB_LINK_QK = ['department_type_job_links'] as const;
export const EMPLOYEE_USER_GROUP_QK = ['employee_user_groups'] as const;
export const HRM_EMPLOYEE_QK = ['hrm_employees'] as const;
export const HRM_SCOPE_QK = ['hrm_scopes'] as const;
export const REGION_QK = ['regions'] as const;

// ── Developer tools ──────────────────────────────────────────────────────────
export const DB_TABLES_QK = ['db_tables'] as const;

// ── Training ─────────────────────────────────────────────────────────────────
export const TRAINING_LINK_TYPE_QK = ['training_link_types'] as const;
export const TRAINING_CATEGORY_QK = ['training_categories'] as const;
export const EMPLOYEE_TRAINING_STATUS_QK = ['employee_training_statuses'] as const;
export const TRAINING_TYPE_QK = ['training_types'] as const;
export const TRAINING_TYPES_ELIGIBLE_QK = (employeeId: number) => ['training_types', 'eligible', employeeId] as const;
export const EMPLOYEE_TRAININGS_QK = (employeeId: number) => ['employee_trainings', employeeId] as const;
export const TRAINING_STATE_QK = (trainingTypeId: number | null) => ['training_state', trainingTypeId] as const;
