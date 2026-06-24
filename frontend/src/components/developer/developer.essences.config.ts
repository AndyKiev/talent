// src/components/developer/developer.essences.config.ts
import TuneIcon from '@mui/icons-material/Tune';
import SecurityIcon from '@mui/icons-material/Security';
import GroupIcon from '@mui/icons-material/Group';
import CategoryIcon from '@mui/icons-material/Category';
import GridViewIcon from '@mui/icons-material/GridView';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import HistoryIcon from '@mui/icons-material/History';
import StorageIcon from '@mui/icons-material/Storage';
import BoltIcon from '@mui/icons-material/Bolt';
import DataObjectIcon from '@mui/icons-material/DataObject';
import type { RawEssenceConfig } from '../../types/essence';

export const ESSENCES: RawEssenceConfig[] = [
  {
    parent: 'developer',
    key: 'translations',
    labelKey: 'translations',
    descriptionKey: 'translationsDesc',
    Icon: TuneIcon,
    color: '#f59e0b',
  },
  {
    parent: 'developer',
    key: 'event_apply',
    labelKey: 'eventApply',
    descriptionKey: 'eventApplyDesc',
    Icon: EventAvailableIcon,
    color: '#10b981',
  },
  {
    parent: 'developer',
    key: 'audit_log',
    labelKey: 'auditLog',
    descriptionKey: 'auditLogDesc',
    Icon: HistoryIcon,
    color: '#0ea5e9',
  },

  // ── Security (group) ──────────────────────────────────────────────────────
  {
    parent: 'developer',
    key: 'security',
    labelKey: 'security',
    descriptionKey: 'securityDesc',
    Icon: SecurityIcon,
    color: '#8b5cf6',
    isGroup: true,
    groupKey: 'security',
  },
  {
    parent: 'developer',
    key: 'user_groups',
    labelKey: 'userGroups',
    descriptionKey: 'userGroupsDesc',
    Icon: GroupIcon,
    color: '#8b5cf6',
    parentGroup: 'security',
  },
  {
    parent: 'developer',
    key: 'user_group_types',
    labelKey: 'userGroupTypes',
    descriptionKey: 'userGroupTypesDesc',
    Icon: CategoryIcon,
    color: '#f59e0b',
    parentGroup: 'security',
  },
  {
    parent: 'developer',
    key: 'permission_matrix',
    labelKey: 'permissionMatrix',
    descriptionKey: 'permissionMatrixDesc',
    Icon: GridViewIcon,
    color: '#8b5cf6',
    parentGroup: 'security',
  },
  {
    parent: 'developer',
    key: 'permissions_overview',
    labelKey: 'permissionsOverview',
    descriptionKey: 'permissionsOverviewDesc',
    Icon: SecurityIcon,
    color: '#6366f1',
    parentGroup: 'security',
  },

  // ── Catalog (group) ───────────────────────────────────────────────────────
  {
    parent: 'developer',
    key: 'catalog',
    labelKey: 'catalog',
    descriptionKey: 'catalogDesc',
    Icon: StorageIcon,
    color: '#0ea5e9',
    isGroup: true,
    groupKey: 'catalog',
  },
  {
    parent: 'developer',
    key: 'operations',
    labelKey: 'operations',
    descriptionKey: 'operationsDesc',
    Icon: BoltIcon,
    color: '#10b981',
    parentGroup: 'catalog',
  },
  {
    parent: 'developer',
    key: 'essences',
    labelKey: 'essences',
    descriptionKey: 'essencesDesc',
    Icon: DataObjectIcon,
    color: '#6366f1',
    parentGroup: 'catalog',
  },
];