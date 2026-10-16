// src/store/departmentOrganigramStore.ts
//
// Per-browser view preferences of the department (structure) organigram —
// kept apart from deptTypeOrganigramStore: its layout overrides are keyed by
// DEPARTMENT id, the type organigram's by TYPE id, so one store would collide.
// Depth override (null = app setting `department_type_organigram_depth`),
// hide inactive (on by default), global orientation + per-branch overrides, the types (find)
// panel's and the jobs panel's usage filter + sort, and where job boxes open. Persisted via zustand.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { OrganigramOrientation } from '../components/organigram/organigramOrientation';
import { JobBoxPlacement } from '../components/admin/department_types/organigram/jobBoxPlacement';
import {
    TypePaletteSort,
    TypePaletteUsage,
} from '../components/admin/department_types/organigram/typePaletteOptions';

interface DepartmentOrganigramState {
    depth: number | null;
    hideInactive: boolean;
    orientation: OrganigramOrientation;
    /** department id -> layout of that department's branch. */
    layoutOverrides: Record<number, OrganigramOrientation>;
    paletteUsage: TypePaletteUsage;
    paletteSort: TypePaletteSort;
    /** Jobs panel (JOBS mode): same two options, kept separately. */
    jobPaletteUsage: TypePaletteUsage;
    jobPaletteSort: TypePaletteSort;
    jobBoxPlacement: JobBoxPlacement;
    /** Header filter: department category whose instances the jump-to list
     *  offers (null = the default main category, key 'store'). */
    categoryId: number | null;
    setDepth: (depth: number | null) => void;
    setHideInactive: (hide: boolean) => void;
    setOrientation: (orientation: OrganigramOrientation) => void;
    /** null removes the override (branch inherits its parent's layout). */
    setLayoutOverride: (departmentId: number, mode: OrganigramOrientation | null) => void;
    setPaletteUsage: (usage: TypePaletteUsage) => void;
    setPaletteSort: (sort: TypePaletteSort) => void;
    setJobPaletteUsage: (usage: TypePaletteUsage) => void;
    setJobPaletteSort: (sort: TypePaletteSort) => void;
    setJobBoxPlacement: (placement: JobBoxPlacement) => void;
    setCategoryId: (id: number | null) => void;
}

export const useDepartmentOrganigramStore = create<DepartmentOrganigramState>()(
    persist(
        (set) => ({
            depth: null,
            hideInactive: true,
            orientation: OrganigramOrientation.TOP_DOWN,
            layoutOverrides: {},
            paletteUsage: TypePaletteUsage.ALL,
            paletteSort: TypePaletteSort.NAME,
            jobPaletteUsage: TypePaletteUsage.ALL,
            jobPaletteSort: TypePaletteSort.NAME,
            jobBoxPlacement: JobBoxPlacement.RIGHT,
            categoryId: null,
            setDepth: (depth) => set({ depth }),
            setHideInactive: (hideInactive) => set({ hideInactive }),
            setOrientation: (orientation) => set({ orientation, layoutOverrides: {} }),
            setLayoutOverride: (departmentId, mode) =>
                set((s) => {
                    const next = { ...s.layoutOverrides };
                    if (mode == null) delete next[departmentId];
                    else next[departmentId] = mode;
                    return { layoutOverrides: next };
                }),
            setPaletteUsage: (paletteUsage) => set({ paletteUsage }),
            setPaletteSort: (paletteSort) => set({ paletteSort }),
            setJobPaletteUsage: (jobPaletteUsage) => set({ jobPaletteUsage }),
            setJobPaletteSort: (jobPaletteSort) => set({ jobPaletteSort }),
            setJobBoxPlacement: (jobBoxPlacement) => set({ jobBoxPlacement }),
            setCategoryId: (categoryId) => set({ categoryId }),
        }),
        {
            name: 'department_organigram_view',
            // v1: "hide inactive" became the default — reset it once for
            // browsers that persisted the old default.
            version: 1,
            migrate: (persisted, version) => {
                const state = persisted as DepartmentOrganigramState;
                return version < 1 ? { ...state, hideInactive: true } : state;
            },
        },
    ),
);
