// src/store/deptTypeOrganigramStore.ts
//
// Per-browser view preferences of the department-types organigram: the
// depth override (null = use the app setting `department_type_organigram_depth`),
// whether inactive types / links are hidden, the global layout orientation
// per-type layout overrides (partial transpose: a type's branch laid out
// differently; cleared whenever the global orientation changes) and the
// types / jobs panels' usage filter + sort, and where job boxes open.
// Persisted via zustand.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { OrganigramOrientation } from '../components/organigram/organigramOrientation';
import { JobBoxPlacement } from '../components/admin/department_types/organigram/jobBoxPlacement';
import {
    TypePaletteSort,
    TypePaletteUsage,
} from '../components/admin/department_types/organigram/typePaletteOptions';

interface DeptTypeOrganigramState {
    depth: number | null;
    hideInactive: boolean;
    orientation: OrganigramOrientation;
    /** department type id -> layout of that type's branch. */
    layoutOverrides: Record<number, OrganigramOrientation>;
    /** Types panel: list all / only linked / only unlinked types. */
    paletteUsage: TypePaletteUsage;
    paletteSort: TypePaletteSort;
    /** Jobs panel (JOBS mode): same two options, kept separately. */
    jobPaletteUsage: TypePaletteUsage;
    jobPaletteSort: TypePaletteSort;
    /** Side of the type card the job box opens on. */
    jobBoxPlacement: JobBoxPlacement;
    setDepth: (depth: number | null) => void;
    setHideInactive: (hide: boolean) => void;
    setOrientation: (orientation: OrganigramOrientation) => void;
    /** null removes the override (branch inherits its parent's layout). */
    setLayoutOverride: (typeId: number, mode: OrganigramOrientation | null) => void;
    setPaletteUsage: (usage: TypePaletteUsage) => void;
    setPaletteSort: (sort: TypePaletteSort) => void;
    setJobPaletteUsage: (usage: TypePaletteUsage) => void;
    setJobPaletteSort: (sort: TypePaletteSort) => void;
    setJobBoxPlacement: (placement: JobBoxPlacement) => void;
}

export const useDeptTypeOrganigramStore = create<DeptTypeOrganigramState>()(
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
            setLayoutOverride: (typeId, mode) =>
                set((s) => {
                    const next = { ...s.layoutOverrides };
                    if (mode == null) delete next[typeId];
                    else next[typeId] = mode;
                    return { layoutOverrides: next };
                }),
            setPaletteUsage: (paletteUsage) => set({ paletteUsage }),
            setPaletteSort: (paletteSort) => set({ paletteSort }),
            setJobPaletteUsage: (jobPaletteUsage) => set({ jobPaletteUsage }),
            setJobPaletteSort: (jobPaletteSort) => set({ jobPaletteSort }),
            setJobBoxPlacement: (jobBoxPlacement) => set({ jobBoxPlacement }),
        }),
        { name: 'dept_type_organigram_view' },
    ),
);
