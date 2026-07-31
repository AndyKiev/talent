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
// Recommended trainings — employee-scoped. The list key includes the
// include-inactive flag so the two variants cache separately; the 2-element
// prefix invalidates BOTH after a write, so toggling the eye never shows a
// stale set.
export const RECOMMENDED_TRAINING_STATUSES_QK = ['recommended_training_statuses'] as const;
export const RECOMMENDED_TRAININGS_QK = (employeeId: number, includeInactive?: boolean) =>
    (includeInactive === undefined
        ? (['recommended_trainings', employeeId] as const)
        : (['recommended_trainings', employeeId, includeInactive] as const));

// The competence summary's sides (strong / to-develop) — a seeded lookup.
export const RSE_DIMENSION_TYPES_QK = ['review_session_employee_dimension_types'] as const;
// The review record's feedback voices (employee / manager) — a seeded lookup.
export const RSE_FEEDBACK_TYPES_QK = ['review_session_employee_feedback_types'] as const;
// The kinds of numbered line (fact / improvement) — a seeded lookup.
export const EMPLOYEE_FACT_TYPES_QK = ['employee_fact_types'] as const;
// One employee's facts not yet attached to a competence (the badge count).
export const EMPLOYEE_UNLINKED_FACTS_QK = (employeeId: number) =>
    ['employee_facts', 'unlinked', employeeId] as const;
export const SESSION_DEPARTMENTS_QK = (sessionId: number) => ['session_departments', sessionId] as const;
export const PEOPLE_REVIEW_SESSION_AVAILABILITY_QK = (sessionId: number) =>
    ['people_review_session_availability', sessionId] as const;
export const OVERSIGHT_MANAGER_OPTIONS_QK = ['oversight_manager_options'] as const;
export const MY_OVERSIGHT_MANAGER_QK = ['my_oversight_manager'] as const;
// Dynamic main-navigation menus
export const MENUS_MY_QK = ['menus_my'] as const;
// Access testing ("test as group")
export const ACCESS_TEST_QK = ['access_test_my'] as const;
export const LANGS_QK = ['langs'] as const;
// Auth: current user (/jwt/users/me) + pre-auth self-registration config
export const AUTH_ME_QK = ['auth_me'] as const;
export const AUTH_REGISTER_CONFIG_QK = ['auth_register_config'] as const;
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

// ── Headcount plan (department job targets) ──────────────────────────────────
export const HEADCOUNT_CALC_QK = (departmentId: number, isoDate: string) =>
    ['headcount_calc', departmentId, isoDate] as const;
export const HEADCOUNT_TARGETS_QK = (departmentId: number, linkId: number) =>
    ['headcount_targets', departmentId, linkId] as const;
export const HEADCOUNT_TARGET_COUNT_BY_LINK_QK = (linkId: number) =>
    ['headcount_target_count_by_link', linkId] as const;
export const HEADCOUNT_FACT_EMPLOYEES_QK = (departmentId: number, isoDate: string, jobId: number) =>
    ['headcount_fact_employees', departmentId, isoDate, jobId] as const;
export const HEADCOUNT_ORGANIGRAM_QK = (departmentId: number, isoDate: string) =>
    ['headcount_organigram', departmentId, isoDate] as const;

// ── Training ─────────────────────────────────────────────────────────────────
export const TRAINING_LINK_TYPE_QK = ['training_link_types'] as const;
export const TRAINING_CATEGORY_QK = ['training_categories'] as const;
export const EMPLOYEE_TRAINING_STATUS_QK = ['employee_training_statuses'] as const;
export const TRAINING_TYPE_QK = ['training_types'] as const;
export const TRAINING_TYPES_ELIGIBLE_QK = (employeeId: number) => ['training_types', 'eligible', employeeId] as const;
export const EMPLOYEE_TRAININGS_QK = (employeeId: number) => ['employee_trainings', employeeId] as const;
export const TRAINING_STATE_QK = (trainingTypeId: number | null) => ['training_state', trainingTypeId] as const;

// ── Recruitment ────────────────────────────────────────────────────────────────
// One module, one block. Each constant is the UPPER_SNAKE of its table + _QK, and the
// first element of the key array is that table name verbatim.
export const RECRUITMENT_TASKS_QK = ['recruitment_tasks'] as const;
export const RECRUITMENT_TASK_STATUSES_QK = ['recruitment_task_statuses'] as const;
export const RECRUITMENT_DIMENSIONS_QK = ['recruitment_dimensions'] as const;
// job_requirement_* keeps the job_ stem: `jobs` owns those rows, recruitment reads them.
export const JOB_REQUIREMENT_GROUPS_QK = (jobId: number) => ['job_requirement_groups', jobId] as const;
export const JOB_REQUIREMENT_ITEMS_QK = (groupId: number) => ['job_requirement_items', groupId] as const;
export const RECRUITMENT_CANDIDATES_QK = ['recruitment_candidates'] as const;
export const RECRUITMENT_CANDIDATE_SOURCES_QK = ['recruitment_candidate_sources'] as const;
export const RECRUITMENT_APPLICATION_STATUSES_QK = ['recruitment_application_statuses'] as const;
export const RECRUITMENT_CANDIDATE_NOTES_QK = (candidateId: number) =>
    ['recruitment_candidate_notes', candidateId] as const;
export const RECRUITMENT_APPLICATIONS_BY_CANDIDATE_QK = (candidateId: number) =>
    ['recruitment_applications', 'candidate', candidateId] as const;
export const RECRUITMENT_APPLICATIONS_BY_TASK_QK = (taskId: number) =>
    ['recruitment_applications', 'task', taskId] as const;
export const RECRUITMENT_INTERVIEWS_QK = (scope: string, id: number | 'mine' | 'all') =>
    ['recruitment_interviews', scope, id] as const;
// Not a table — a computed endpoint, so it keeps its own name.
export const AVAILABLE_INTERVIEWERS_QK = ['available_interviewers'] as const;
export const RECRUITMENT_INTERVIEW_FEEDBACKS_BY_CANDIDATE_QK = (candidateId: number) =>
    ['recruitment_interview_feedbacks', 'candidate', candidateId] as const;

// ── Employee development missions ───────────────────────────────────────────────
export const EMPLOYEE_MISSIONS_QK = (employeeId: number) =>
    ['employee_missions', employeeId] as const;
export const MISSION_COMMENTS_QK = (missionId: number) =>
    ['mission_comments', missionId] as const;
export const MISSION_HISTORY_QK = (missionId: number) =>
    ['mission_history', missionId] as const;
// Whole-employee mission trail (includes deleted missions).
export const EMPLOYEE_MISSION_HISTORY_QK = (employeeId: number) =>
    ['employee_mission_history', employeeId] as const;
export const DEVELOPMENT_VISION_QK = (employeeId: number) =>
    ['development_vision', employeeId] as const;
// Competence options for the mission form. Near-static, so both hosts (employee
// card + people-review tab) share this one cache entry.
export const MISSION_DIMENSION_OPTIONS_QK = ['mission_dimension_options'] as const;

// Person events (surname history). key[0] is the table name; the person id is
// appended by the consumer so one person's list invalidates alone.
export const PERSON_EVENTS_QK = ['person_events'] as const;
