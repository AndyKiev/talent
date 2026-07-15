// userGridColumnsStore.ts
//
// Per-user (per-browser) DataGrid column visibility, persisted to localStorage.
//
// Two maps, keyed by table (a UserGridTable value):
//   tables[tableKey][field] = { visible }  — the user's visibility OVERRIDES.
//   knownColumns[tableKey]  = [{ field, headerName }]  — the columns the grid
//     last rendered. This is what the settings panel lists, so it is ALWAYS in
//     sync with the real grid: add a column to the grid and it shows up here
//     automatically (nothing to lose). A field absent from `tables` defaults to
//     visible, so a brand-new column is shown until the user hides it.
//
// localStorage key: `user_grid_columns`. Opt-in registry: utils/userGridTables.ts.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserGridColumnState {
    visible: boolean;
}

export type UserGridTableColumns = Record<string, UserGridColumnState>;

export interface KnownGridColumn {
    field: string;
    headerName: string;
}

interface UserGridColumnsState {
    tables: Record<string, UserGridTableColumns>;
    knownColumns: Record<string, KnownGridColumn[]>;

    /**
     * Record the grid's CURRENT columns (called by the grid on mount / when its
     * columns change). No-ops if unchanged so it never loops. Also prunes
     * visibility overrides for fields the grid no longer has.
     */
    syncKnownColumns: (tableKey: string, columns: KnownGridColumn[]) => void;

    /** Overwrite one table's overrides from a full visibility model. */
    applyVisibilityModel: (
        tableKey: string,
        model: Record<string, boolean>,
        allFields: string[],
    ) => void;

    /** Flip a single field — used by the settings panel switches. */
    setColumnVisible: (tableKey: string, field: string, visible: boolean) => void;

    /** Drop the table's overrides entirely → grid falls back to its defaults. */
    resetTable: (tableKey: string) => void;
}

export const useUserGridColumnsStore = create<UserGridColumnsState>()(
    persist(
        (set) => ({
            tables: {},
            knownColumns: {},

            syncKnownColumns: (tableKey, columns) => {
                set((state) => {
                    const prev = state.knownColumns[tableKey];
                    const same =
                        prev &&
                        prev.length === columns.length &&
                        prev.every(
                            (c, i) =>
                                c.field === columns[i].field &&
                                c.headerName === columns[i].headerName,
                        );
                    if (same) return state;

                    // Prune overrides for fields that no longer exist on the grid.
                    const fields = new Set(columns.map((c) => c.field));
                    const table = state.tables[tableKey];
                    let tables = state.tables;
                    if (table) {
                        const pruned: UserGridTableColumns = {};
                        for (const [field, cfg] of Object.entries(table)) {
                            if (fields.has(field)) pruned[field] = cfg;
                        }
                        tables = { ...state.tables, [tableKey]: pruned };
                    }

                    return {
                        knownColumns: { ...state.knownColumns, [tableKey]: columns },
                        tables,
                    };
                });
            },

            applyVisibilityModel: (tableKey, model, allFields) => {
                set((state) => {
                    const next: UserGridTableColumns = {};
                    for (const field of allFields) {
                        // MUI's model only lists overridden fields; absent = visible.
                        next[field] = { visible: model[field] !== false };
                    }
                    return { tables: { ...state.tables, [tableKey]: next } };
                });
            },

            setColumnVisible: (tableKey, field, visible) => {
                set((state) => {
                    const table = state.tables[tableKey] ?? {};
                    return {
                        tables: {
                            ...state.tables,
                            [tableKey]: { ...table, [field]: { visible } },
                        },
                    };
                });
            },

            resetTable: (tableKey) => {
                set((state) => {
                    if (!state.tables[tableKey]) return state;
                    const tables = { ...state.tables };
                    delete tables[tableKey];
                    return { tables };
                });
            },
        }),
        {
            name: 'user_grid_columns',
            // knownColumns is refreshed by the grid on every mount; persisting it
            // only so the settings panel can list columns before the grid is
            // visited this session.
            partialize: (state) => ({
                tables: state.tables,
                knownColumns: state.knownColumns,
            }),
        },
    ),
);
