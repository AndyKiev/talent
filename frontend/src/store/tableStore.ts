// tableStore.ts
import { create } from 'zustand';

// ---------------------------------------------------------------------------
// Stable empty-state sentinel
// ---------------------------------------------------------------------------
// A module-level constant used as the fallback for any table that has no
// editing state yet.  Because it's a single object reference, Zustand's
// useSyncExternalStore snapshot comparison (Object.is) will always return
// "unchanged" for uninitialised tables — preventing infinite re-render loops
// that occur when an inline `?? {}` fallback is used inside a selector.
// ---------------------------------------------------------------------------
const EMPTY_EDITING_STATE = Object.freeze({
    editingId:     null as number | null,
    editingField:  null as string | null,
    editingValues: Object.freeze({}) as Record<string, unknown>,
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EditingState {
    editingId:     number | null;
    editingField:  string | null;
    editingValues: Record<string, unknown>;
}

export type SelectedRows = Record<string, {
    selectedId:   number | null;
    selectedData: unknown;
}>;

interface TableState {
    selectedRows: SelectedRows;

    filters: Record<string, Record<string, unknown>>;

    editingStates: Record<string, EditingState>;

    // Actions
    setSelectedRow:   (tableName: string, id: number | null, data?: unknown) => void;
    setFilter:        (tableName: string, filterType: string, value: unknown) => void;
    clearFilter:      (tableName: string, filterType?: string) => void;
    clearAllFilters:  () => void;

    startEditing:        (tableName: string, entityId: number, field: string, initialValue: unknown) => void;
    cancelEditing:       (tableName: string) => void;
    updateEditingValue:  (tableName: string, field: string, value: unknown) => void;
    getEditingState:     (tableName: string) => EditingState;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useTableStore = create<TableState>((set, get) => ({
    selectedRows:  {},
    filters:       {},
    editingStates: {},

    // ── Row selection ────────────────────────────────────────────────────────
    setSelectedRow: (tableName, id, data) => {
        set(state => ({
            selectedRows: {
                ...state.selectedRows,
                [tableName]: { selectedId: id, selectedData: data ?? null },
            },
        }));
    },

    // ── Filters ──────────────────────────────────────────────────────────────
    setFilter: (tableName, filterType, value) => {
        set(state => ({
            filters: {
                ...state.filters,
                [tableName]: { ...state.filters[tableName], [filterType]: value },
            },
        }));
    },

    clearFilter: (tableName, filterType) => {
        set(state => {
            if (!filterType) {
                const newFilters = { ...state.filters };
                delete newFilters[tableName];
                return { filters: newFilters };
            }
            const tableFilters = { ...state.filters[tableName] };
            delete tableFilters[filterType];
            return { filters: { ...state.filters, [tableName]: tableFilters } };
        });
    },

    clearAllFilters: () => set({ filters: {} }),

    // ── Editing ──────────────────────────────────────────────────────────────
    startEditing: (tableName, entityId, field, initialValue) => {
        set(state => ({
            editingStates: {
                ...state.editingStates,
                [tableName]: {
                    editingId:    entityId,
                    editingField: field,
                    editingValues: {
                        ...state.editingStates[tableName]?.editingValues,
                        [field]: initialValue,
                    },
                },
            },
        }));
    },

    cancelEditing: (tableName) => {
        set(state => {
            const current = state.editingStates[tableName];

            // No-op if the table is already in the empty state — avoids writing
            // a new {} object into the store on every call, which would invalidate
            // all selectors subscribed to editingValues even when nothing changed.
            if (!current || (
                current.editingId    === null &&
                current.editingField === null &&
                Object.keys(current.editingValues).length === 0
            )) {
                return state; // return same reference → no re-render
            }

            return {
                editingStates: {
                    ...state.editingStates,
                    // Reuse the frozen sentinel so downstream selectors get the
                    // same object reference for an "empty" editing state.
                    [tableName]: EMPTY_EDITING_STATE,
                },
            };
        });
    },

    updateEditingValue: (tableName, field, value) => {
        set(state => ({
            editingStates: {
                ...state.editingStates,
                [tableName]: {
                    ...state.editingStates[tableName],
                    editingValues: {
                        ...state.editingStates[tableName]?.editingValues,
                        [field]: value,
                    },
                },
            },
        }));
    },

    // getEditingState is called imperatively (not as a selector) so it's safe
    // to return a fallback object here — it won't be used in useSyncExternalStore.
    getEditingState: (tableName) => {
        return get().editingStates[tableName] ?? EMPTY_EDITING_STATE;
    },
}));