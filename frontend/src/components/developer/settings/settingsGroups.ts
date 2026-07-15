// src/components/developer/settings/settingsGroups.ts
//
// Presentational grouping of app-settings into "menu-based" cards (plus a
// General catch-all). Grouping is purely a UI concern — nothing on the backend
// gates on it — so it lives here as a static map instead of a DB column.
//
// Each group renders as a card on both the developer settings page and the
// user settings page; clicking a card opens that group's own TanStack route
// (/developer/settings/$groupKey and /settings/$groupKey) where the settings
// render exactly as before. A child setting (parent_id set) always inherits its
// parent's group so a multi-story master + its children never split across
// cards. Anything unmapped (e.g. a setting added at runtime via the Add dialog)
// falls into `general`.
import PeopleIcon from '@mui/icons-material/People';
import RateReviewIcon from '@mui/icons-material/RateReview';
import SchoolIcon from '@mui/icons-material/School';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import TuneIcon from '@mui/icons-material/Tune';
import type { ElementType } from 'react';
import type { AppSetting } from './settingsApi';

export interface SettingsGroup {
    key: string;
    labelKey: string;
    descriptionKey: string;
    Icon: ElementType;
    color: string;
}

// Card order = display order. Only groups that actually hold at least one
// setting are rendered (see SettingsPage / UserSettingsPage).
export const SETTINGS_GROUPS: SettingsGroup[] = [
    {
        key: 'employees',
        labelKey: 'settingsGroupEmployees',
        descriptionKey: 'settingsGroupEmployeesDesc',
        Icon: PeopleIcon,
        color: '#0ea5e9',
    },
    {
        key: 'people_review',
        labelKey: 'settingsGroupPeopleReview',
        descriptionKey: 'settingsGroupPeopleReviewDesc',
        Icon: RateReviewIcon,
        color: '#1e87e9',
    },
    {
        key: 'training',
        labelKey: 'settingsGroupTraining',
        descriptionKey: 'settingsGroupTrainingDesc',
        Icon: SchoolIcon,
        color: '#f65c6b',
    },
    {
        key: 'recruitment',
        labelKey: 'settingsGroupRecruitment',
        descriptionKey: 'settingsGroupRecruitmentDesc',
        Icon: PersonSearchIcon,
        color: '#e97a1e',
    },
    {
        key: 'admin',
        labelKey: 'settingsGroupAdmin',
        descriptionKey: 'settingsGroupAdminDesc',
        Icon: AdminPanelSettingsIcon,
        color: '#8b5cf6',
    },
    {
        key: 'general',
        labelKey: 'settingsGroupGeneral',
        descriptionKey: 'settingsGroupGeneralDesc',
        Icon: TuneIcon,
        color: '#10b981',
    },
];

export const GENERAL_GROUP_KEY = 'general';

const GROUP_KEYS = new Set(SETTINGS_GROUPS.map((g) => g.key));

/** Fast lookup of a group config by its key. */
export const SETTINGS_GROUP_BY_KEY: Record<string, SettingsGroup> =
    Object.fromEntries(SETTINGS_GROUPS.map((g) => [g.key, g]));

// Top-level setting key -> group key. Children are NOT listed here — they
// inherit the parent's group in groupForSetting(). Any key missing from this
// map lands in `general`.
export const SETTING_GROUP_BY_KEY: Record<string, string> = {
    // ── Employees ────────────────────────────────────────────────────────────
    employee_default_level_persist: 'employees',
    employee_create_allow_talent_period: 'employees',
    // Photo master is cross-menu (employees + review + presentation); grouped
    // under the primary home menu. Its 6 children inherit this via parent_id.
    employee_photos_enabled: 'employees',
    // Headcount-plan master; its fact-humans-only child inherits via parent_id.
    headcount_plan_enabled: 'employees',
    // Where clicking an employee forwards (career_history / events / summary).
    employee_select_target: 'employees',
    // ── People review ────────────────────────────────────────────────────────
    people_review_edit_talent_status: 'people_review',
    idp_min_missions: 'people_review',
    idp_max_missions: 'people_review',
    idp_allow_full_competence_list: 'people_review',
    people_review_summary_full_competence_list: 'people_review',
    review_session_filter_by_department: 'people_review',
    review_session_filter_job_categories: 'people_review',
    review_session_filter_employee_statuses: 'people_review',
    tempo_show_proposed_level_basic: 'people_review',
    tempo_show_proposed_level_same: 'people_review',
    people_review_prefetch_employees: 'people_review',
    people_review_prefetch_max_employees: 'people_review',
    people_review_show_trainings: 'people_review',
    oversight_assign_max_levels_up: 'people_review',
    // ── Training ─────────────────────────────────────────────────────────────
    // Master; its delete-on-disable child inherits this via parent_id.
    training_module_enabled: 'training',
    // ── Recruitment ──────────────────────────────────────────────────────────
    recruitment_module_enabled: 'recruitment',
    // ── Admin ────────────────────────────────────────────────────────────────
    job_apply_category_on_create: 'admin',
    // ── General (not tied to a single menu) ──────────────────────────────────
    self_registration_enabled: 'general',
    default_menu: 'general',
};

/**
 * Resolve a group key from a setting KEY alone (no parent lookup). Used on the
 * user settings side, where the effective payload only ever contains top-level
 * user-overridable settings (children are all app-only). Unmapped -> `general`.
 */
export function groupForKey(key: string): string {
    const g = SETTING_GROUP_BY_KEY[key];
    return g && GROUP_KEYS.has(g) ? g : GENERAL_GROUP_KEY;
}

/**
 * Resolve the group key for a setting. A child setting (parent_id set) inherits
 * its parent's group so master + children stay on one card; otherwise the
 * static map is used, defaulting to `general` for unmapped keys.
 *
 * `byId` lets a child look its parent up; pass a Map keyed by setting id.
 */
export function groupForSetting(
    setting: AppSetting,
    byId: Map<number, AppSetting>,
): string {
    if (setting.parent_id != null) {
        const parent = byId.get(setting.parent_id);
        if (parent) return groupForSetting(parent, byId);
    }
    const key = SETTING_GROUP_BY_KEY[setting.key];
    return key && GROUP_KEYS.has(key) ? key : GENERAL_GROUP_KEY;
}
