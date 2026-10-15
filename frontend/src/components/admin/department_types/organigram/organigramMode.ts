// src/components/admin/department_types/organigram/organigramMode.ts
//
// What the department-types organigram lets you edit. Exactly one at a time:
// type links and job links can never be dragged in the same mode.
import type { GetStringFn } from '../../../../types/getStringFn';

export enum OrganigramMode {
    /** Read-only: drill, find, open job boxes. */
    VIEW = 'view',
    /** Drag type cards: move / add / unlink parental links (blue). */
    TYPES = 'types',
    /** Drag jobs: link / move / unlink jobs on types (green). */
    JOBS = 'jobs',
}

/** MUI palette colour that tints each editing mode. */
export const MODE_COLOR: Record<OrganigramMode, 'inherit' | 'info' | 'success'> = {
    [OrganigramMode.VIEW]: 'inherit',
    [OrganigramMode.TYPES]: 'info',
    [OrganigramMode.JOBS]: 'success',
};

const LABEL_KEY: Record<OrganigramMode, string> = {
    [OrganigramMode.VIEW]: 'deptTypeOrgModeView',
    [OrganigramMode.TYPES]: 'deptTypeOrgModeTypes',
    [OrganigramMode.JOBS]: 'deptTypeOrgModeJobs',
};

export const organigramModeLabel = (mode: OrganigramMode, getString: GetStringFn): string =>
    getString(LABEL_KEY[mode]);
