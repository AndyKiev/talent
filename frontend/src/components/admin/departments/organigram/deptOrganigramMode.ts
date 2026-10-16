// src/components/admin/departments/organigram/deptOrganigramMode.ts
//
// What the department (structure) organigram lets you do.
import type { GetStringFn } from '../../../../types/getStringFn';

export enum DeptOrganigramMode {
    /** Read-only: drill, find, open job boxes. */
    VIEW = 'view',
    /** Drag to re-parent + card actions (add child, edit, generate, delete). */
    STRUCTURE = 'structure',
    /** Drag jobs: link / move / unlink jobs on the department's TYPE (green) —
     *  a change applies to every department of that type. */
    JOBS = 'jobs',
}

/** MUI palette colour that tints each mode. */
export const DEPT_MODE_COLOR: Record<DeptOrganigramMode, 'inherit' | 'info' | 'success'> = {
    [DeptOrganigramMode.VIEW]: 'inherit',
    [DeptOrganigramMode.STRUCTURE]: 'info',
    [DeptOrganigramMode.JOBS]: 'success',
};

const LABEL_KEY: Record<DeptOrganigramMode, string> = {
    [DeptOrganigramMode.VIEW]: 'deptTypeOrgModeView',
    [DeptOrganigramMode.STRUCTURE]: 'deptOrgModeStructure',
    [DeptOrganigramMode.JOBS]: 'deptTypeOrgModeJobs',
};

export const deptOrganigramModeLabel = (mode: DeptOrganigramMode, getString: GetStringFn): string =>
    getString(LABEL_KEY[mode]);
