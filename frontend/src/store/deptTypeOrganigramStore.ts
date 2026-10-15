// src/store/deptTypeOrganigramStore.ts
//
// Per-browser view preferences of the department-types organigram: the
// depth override (null = use the app setting `department_type_organigram_depth`),
// whether inactive types / links are hidden, the global layout orientation
// and per-type layout overrides (partial transpose: a type's branch laid out
// differently; cleared whenever the global orientation changes).
// Persisted via zustand.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { OrganigramOrientation } from '../components/organigram/organigramOrientation';
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
    setDepth: (depth: number | null) => void;
    setHideInactive: (hide: boolean) => void;
    setOrientation: (orientation: OrganigramOrientation) => void;
    /** null removes the override (branch inherits its parent's layout). */
    setLayoutOverride: (typeId: number, mode: OrganigramOrientation | null) => void;
    setPaletteUsage: (usage: TypePaletteUsage) => void;
    setPaletteSort: (sort: TypePaletteSort) => void;
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
        }),
        { name: 'dept_type_organigram_view' },
    ),
);
