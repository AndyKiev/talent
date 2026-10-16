// src/store/departmentOrganigramStore.ts
//
// Per-browser view preferences of the department (structure) organigram —
// kept apart from deptTypeOrganigramStore: its layout overrides are keyed by
// DEPARTMENT id, the type organigram's by TYPE id, so one store would collide.
// Depth override (null = app setting `department_type_organigram_depth`),
// hide inactive, global orientation + per-branch overrides, the types (find)
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
}

export const useDepartmentOrganigramStore = create<DepartmentOrganigramState>()(
    persist(
        (set) => ({
            depth: null,
            hideInactive: false,
            orientation: OrganigramOrientation.TOP_DOWN,
            layoutOverrides: {},
            paletteUsage: TypePaletteUsage.ALL,
            paletteSort: TypePaletteSort.NAME,
            jobPaletteUsage: TypePaletteUsage.ALL,
            jobPaletteSort: TypePaletteSort.NAME,
            jobBoxPlacement: JobBoxPlacement.RIGHT,
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
        }),
        { name: 'department_organigram_view' },
    ),
);
