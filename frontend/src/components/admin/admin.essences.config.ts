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
import type { RawEssenceConfig } from '../../types/essence';
import DomainIcon from "@mui/icons-material/Domain";
import RateReviewIcon from "@mui/icons-material/RateReview";

export const ESSENCES: RawEssenceConfig[] = [
  {
    parent: 'admin',
    key: 'structure',                     // → /admin/structure
    labelKey: 'structure',
    descriptionKey: 'structureDesc',
    Icon: AccountTreeIcon,
    color: '#14b8a6',
  },
  {
    parent: 'admin',
    key: 'talent-statuses',
    labelKey: 'talentStatuses',
    descriptionKey: 'talentStatusesDesc',
    Icon: TuneIcon,
    color: '#6366f1',
  },
  {
    parent: 'admin',
    key: 'talent-periods',
    labelKey: 'talentPeriods',
    descriptionKey: 'talentPeriodsDesc',
    Icon: TimelineIcon,
    color: '#0ea5e9',
  },
  {
    parent: 'admin',
    key: 'talent-status-period-links',
    labelKey: 'talentStatusPeriodLinks',
    descriptionKey: 'talentStatusPeriodLinksDesc',
    Icon: LinkIcon,
    color: '#f33145',
  },
  {
    parent: 'admin',
    key: 'jobs',
    labelKey: 'jobs',
    descriptionKey: 'jobsDesc',
    Icon: WorkIcon,
    color: '#10b981',
  },
  {
    parent: 'admin',
    key: 'user-group-types',
    labelKey: 'userGroupTypes',
    descriptionKey: 'userGroupTypesDesc',
    Icon: CategoryIcon,
    color: '#f59e0b',
  },
  {
    parent: 'admin',
    key: 'user-groups',
    labelKey: 'userGroups',
    descriptionKey: 'userGroupsDesc',
    Icon: GroupIcon,
    color: '#8b5cf6',
  },
  {
    parent: 'admin',
    key: 'department_categories',
    labelKey: 'departmentCategories',
    descriptionKey: 'departmentCategoriesDesc',
    Icon: ApartmentIcon,
    color: '#f43f5e',
  },
  {
    parent: 'admin',
    key: 'department_types',
    labelKey: 'departmentTypes',
    descriptionKey: 'departmentTypesDesc',
    Icon: AccountTreeIcon,
    color: '#14b8a6',
  },
  {
    parent: 'admin',
    key: 'review-dimensions',
    labelKey: 'reviewDimensions',
    descriptionKey: 'reviewDimensionsDesc',
    Icon: RateReviewIcon,
    color: '#e91e63',
  },
  // NEW: Employee Events Group Container
  {
    parent: 'admin',
    key: 'employee_events',
    labelKey: 'employeeEvents',
    descriptionKey: 'employeeEventsDesc',
    Icon: EventNoteIcon,
    color: '#8b5cf6',
    isGroup: true,           // Mark as group
    groupKey: 'employee_events',
  },
  // Child items that belong to the group
  {
    parent: 'admin',
    key: 'employee_event_types',
    labelKey: 'employeeEventTypes',
    descriptionKey: 'employeeEventTypesDesc',
    Icon: EditCalendarIcon,
    color: '#32b814',
    parentGroup: 'employee_events',  // Belongs to this group
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
];