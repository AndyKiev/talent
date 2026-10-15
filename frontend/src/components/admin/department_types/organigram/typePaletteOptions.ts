// src/components/admin/department_types/organigram/typePaletteOptions.ts
//
// View options of the organigram's types panel: which types to list (by
// usage) and their sort order.
import type { GetStringFn } from '../../../../types/getStringFn';

export enum TypePaletteSort {
    /** Alphabetical. */
    NAME = 'name',
    /** Most places in the drawn tree first, then by name. */
    USAGE = 'usage',
}

const LABEL_KEY: Record<TypePaletteSort, string> = {
    [TypePaletteSort.NAME]: 'deptTypeOrgSortName',
    [TypePaletteSort.USAGE]: 'deptTypeOrgSortUsage',
};

export const typePaletteSortLabel = (sort: TypePaletteSort, getString: GetStringFn): string =>
    getString(LABEL_KEY[sort]);

export enum TypePaletteUsage {
    ALL = 'all',
    /** In at least one link. */
    USED = 'used',
    /** In no link at all. */
    UNUSED = 'unused',
}

const USAGE_LABEL_KEY: Record<TypePaletteUsage, string> = {
    [TypePaletteUsage.ALL]: 'deptTypeOrgUsageAll',
    [TypePaletteUsage.USED]: 'deptTypeOrgUsageUsed',
    [TypePaletteUsage.UNUSED]: 'deptTypeOrgUsageUnused',
};

export const typePaletteUsageLabel = (usage: TypePaletteUsage, getString: GetStringFn): string =>
    getString(USAGE_LABEL_KEY[usage]);
