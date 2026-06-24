// src/components/admin/admin.essences.config.ts
import TuneIcon from '@mui/icons-material/Tune';
import WorkIcon from '@mui/icons-material/Work';
import GroupIcon from '@mui/icons-material/Group';
import CategoryIcon from '@mui/icons-material/Category';
import ApartmentIcon from '@mui/icons-material/Apartment';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import EditCalendarIcon from '@mui/icons-material/EditCalendar';
import TimelineIcon from '@mui/icons-material/Timeline';
import LinkIcon from '@mui/icons-material/Link';
import EventNoteIcon from '@mui/icons-material/EventNote';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import FlagIcon from '@mui/icons-material/Flag';
import WorkspacesIcon from '@mui/icons-material/Workspaces';
import LabelIcon from '@mui/icons-material/Label';
import DomainIcon from '@mui/icons-material/Domain';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import RuleFolderIcon from '@mui/icons-material/RuleFolder';


import type { RawEssenceConfig } from '../../types/essence';

export const ESSENCES: RawEssenceConfig[] = [

  // ── Talent (group) ────────────────────────────────────────────────────────
  {
    parent: 'admin',
    key: 'talent',
    labelKey: 'talent',
    descriptionKey: 'talentDesc',
    Icon: TuneIcon,
    color: '#f59e0b',
    isGroup: true,
    groupKey: 'talent',
  },
  {
    parent: 'admin',
    key: 'talent-status-period-links',
    labelKey: 'talentStatusPeriodLinks',
    descriptionKey: 'talentStatusPeriodLinksDesc',
    Icon: LinkIcon,
    color: '#f33145',
    parentGroup: 'talent',
  },
  {
    parent: 'admin',
    key: 'talent-periods',
    labelKey: 'talentPeriods',
    descriptionKey: 'talentPeriodsDesc',
    Icon: TimelineIcon,
    color: '#0ea5e9',
    parentGroup: 'talent',
  },
  {
    parent: 'admin',
    key: 'talent-statuses',
    labelKey: 'talentStatuses',
    descriptionKey: 'talentStatusesDesc',
    Icon: TuneIcon,
    color: '#6366f1',
    parentGroup: 'talent',
  },

  // ── Jobs (group) ──────────────────────────────────────────────────────────
  {
    parent: 'admin',
    key: 'jobs_group',
    labelKey: 'jobs',
    descriptionKey: 'jobsGroupDesc',
    Icon: WorkIcon,
    color: '#10b981',
    isGroup: true,
    groupKey: 'jobs_group',
  },
  {
    parent: 'admin',
    key: 'jobs',
    labelKey: 'jobs',
    descriptionKey: 'jobsDesc',
    Icon: WorkIcon,
    color: '#10b981',
    parentGroup: 'jobs_group',
  },
  {
    parent: 'admin',
    key: 'job_groups',
    labelKey: 'jobGroups',
    descriptionKey: 'jobGroupsDesc',
    Icon: WorkspacesIcon,
    color: '#0ea5e9',
    parentGroup: 'jobs_group',
  },
  {
    parent: 'admin',
    key: 'job_group_types',
    labelKey: 'jobGroupTypes',
    descriptionKey: 'jobGroupTypesDesc',
    Icon: LabelIcon,
    color: '#0284c7',
    parentGroup: 'jobs_group',
  },

  // ── User Groups (group) ───────────────────────────────────────────────────
  {
    parent: 'admin',
    key: 'user_groups_group',
    labelKey: 'userGroups',
    descriptionKey: 'userGroupsGroupDesc',
    Icon: GroupIcon,
    color: '#8b5cf6',
    isGroup: true,
    groupKey: 'user_groups_group',
  },
  {
    parent: 'admin',
    key: 'user-groups',
    labelKey: 'userGroups',
    descriptionKey: 'userGroupsDesc',
    Icon: GroupIcon,
    color: '#8b5cf6',
    parentGroup: 'user_groups_group',
  },
  {
    parent: 'admin',
    key: 'user-group-types',
    labelKey: 'userGroupTypes',
    descriptionKey: 'userGroupTypesDesc',
    Icon: CategoryIcon,
    color: '#f59e0b',
    parentGroup: 'user_groups_group',
  },

  // ── Departments (group) ───────────────────────────────────────────────────
  {
    parent: 'admin',
    key: 'departments_group',
    labelKey: 'departments',
    descriptionKey: 'departmentsGroupDesc',
    Icon: ApartmentIcon,
    color: '#f43f5e',
    isGroup: true,
    groupKey: 'departments_group',
  },
  {
    parent: 'admin',
    key: 'structure',
    labelKey: 'structure',
    descriptionKey: 'structureDesc',
    Icon: AccountTreeIcon,
    color: '#14b8a6',
    parentGroup: 'departments_group',
  },
  {
    parent: 'admin',
    key: 'department_categories',
    labelKey: 'departmentCategories',
    descriptionKey: 'departmentCategoriesDesc',
    Icon: ApartmentIcon,
    color: '#f43f5e',
    parentGroup: 'departments_group',
  },
  {
    parent: 'admin',
    key: 'department_types',
    labelKey: 'departmentTypes',
    descriptionKey: 'departmentTypesDesc',
    Icon: AccountTreeIcon,
    color: '#14b8a6',
    parentGroup: 'departments_group',
  },

  // ── Employee Events (group) ───────────────────────────────────────────────
  {
    parent: 'admin',
    key: 'employee_events',
    labelKey: 'employeeEvents',
    descriptionKey: 'employeeEventsDesc',
    Icon: EventNoteIcon,
    color: '#0ea5e9',
    isGroup: true,
    groupKey: 'employee_events',
  },
  {
    parent: 'admin',
    key: 'employee_event_types',
    labelKey: 'employeeEventTypes',
    descriptionKey: 'employeeEventTypesDesc',
    Icon: EditCalendarIcon,
    color: '#32b814',
    parentGroup: 'employee_events',
  },
  {
    parent: 'admin',
    key: 'employee_event_direction_types',
    labelKey: 'employeeEventDirectionTypes',
    descriptionKey: 'employeeEventDirectionTypesDesc',
    Icon: SwapHorizIcon,
    color: '#f97316',
    parentGroup: 'employee_events',
  },
  {
    parent: 'admin',
    key: 'employee_event_statuses',
    labelKey: 'employeeEventStatuses',
    descriptionKey: 'employeeEventStatusesDesc',
    Icon: FlagIcon,
    color: '#f59e0b',
    parentGroup: 'employee_events',
  },
  {
    parent: 'admin',
    key: 'employee_event_change_dept_types',
    labelKey: 'employeeEventChangeDeptTypes',
    descriptionKey: 'employeeEventChangeDeptTypesDesc',
    Icon: DomainIcon,
    color: '#06b6d4',
    parentGroup: 'employee_events',
  },
  {
    parent: 'admin',
    key: 'planning_setup',
    labelKey: 'planningSetup',
    descriptionKey: 'planningSetupDesc',
    Icon: FactCheckIcon,
    color: '#5ee90e',
    isGroup: true,
    groupKey: 'planning_setup',
  },
  {
    parent: 'admin',
    key: 'plan_session_status',
    labelKey: 'planSessionStatuses',
    descriptionKey: 'planSessionStatusesDesc',
    Icon: TuneIcon,
    color: '#6366f1',
    parentGroup: 'planning_setup',
  },
  {
    parent: 'admin',
    key: 'plan_category_defaults',
    labelKey: 'planCategoryDefaults',
    descriptionKey: 'planCategoryDefaultsDesc',
    Icon: PlaylistAddCheckIcon,
    color: '#f43f5e',
    parentGroup: 'planning_setup',
  },
  {
    parent: 'admin',
    key: 'plan_scope_defaults',
    labelKey: 'planScopeDefaults',
    descriptionKey: 'planScopeDefaultsDesc',
    Icon: RuleFolderIcon,
    color: '#10b981',
    parentGroup: 'planning_setup',
  },
];