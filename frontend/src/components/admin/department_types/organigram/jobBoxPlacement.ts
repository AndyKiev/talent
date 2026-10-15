// src/components/admin/department_types/organigram/jobBoxPlacement.ts
//
// Which side of its type card the job box (DepartmentTypeJobBox) opens on.
import type { GetStringFn } from '../../../../types/getStringFn';

export enum JobBoxPlacement {
    RIGHT = 'right',
    LEFT = 'left',
    TOP = 'top',
    BOTTOM = 'bottom',
}

const LABEL_KEY: Record<JobBoxPlacement, string> = {
    [JobBoxPlacement.RIGHT]: 'deptTypeOrgJobBoxRight',
    [JobBoxPlacement.LEFT]: 'deptTypeOrgJobBoxLeft',
    [JobBoxPlacement.TOP]: 'deptTypeOrgJobBoxTop',
    [JobBoxPlacement.BOTTOM]: 'deptTypeOrgJobBoxBottom',
};

export const jobBoxPlacementLabel = (placement: JobBoxPlacement, getString: GetStringFn): string =>
    getString(LABEL_KEY[placement]);
