// src/components/developer/developer.essences.config.ts
import TuneIcon from '@mui/icons-material/Tune';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import CategoryIcon from '@mui/icons-material/Category';
import BadgeIcon from '@mui/icons-material/Badge';
import type { RawEssenceConfig } from '../../types/essence';

export const ESSENCES: RawEssenceConfig[] = [
  {
    parent: 'developer',
    key: 'translations',
    labelKey: 'translations',
    descriptionKey: 'translationsDesc',
    Icon: TuneIcon,
    color: '#6366f1',
  },

  // ── Process Roles (group) — catalogs: process, process_role ────────────────
  {
    parent: 'developer',
    key: 'process_roles',
    labelKey: 'processRolesGroup',
    descriptionKey: 'processRolesGroupDesc',
    Icon: AccountTreeIcon,
    color: '#0ea5e9',
    isGroup: true,
    groupKey: 'process_roles',
  },
  {
    parent: 'developer',
    key: 'process',
    labelKey: 'processes',
    descriptionKey: 'processesDesc',
    Icon: CategoryIcon,
    color: '#0ea5e9',
    parentGroup: 'process_roles',
  },
  {
    parent: 'developer',
    key: 'process_role',
    labelKey: 'processRoles',
    descriptionKey: 'processRolesDesc',
    Icon: BadgeIcon,
    color: '#6366f1',
    parentGroup: 'process_roles',
  },
];
