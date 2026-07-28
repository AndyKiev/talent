// src/hooks/useCrudGrid.ts
//
// Tier C of the essence-slice DRY work, on top of createCrudApi (tier A, the
// api quartet) and useCrudMutations (tier B, the mutation trio). Every admin
// XCrud component repeated the same six useState blocks, the same list query
// and the same eight handlers around them; this owns all of it and returns
// them, so the component keeps only its own JSX.
//
// Deliberately NOT a zustand store: this is per-mount UI state (which dialog is
// open, which cell is being edited). A global store would make two mounts of the
// same grid share a delete dialog and would need manual reset on unmount.
// Zustand stays reserved for persistent cross-navigation prefs.
import { useCallback, useMemo, useState, type MouseEvent } from 'react';
import { useQuery, type QueryKey } from '@tanstack/react-query';
import { useCrudMutations } from './useCrudMutations';
import { useDataGridLocale } from './useDataGridLocale';
import type { EditingState } from '../utils/columnBuilders';
import type { PendingEdit } from '../components/ui/FieldEditConfirmDialog';
import type { GetStringFn } from '../types/getStringFn';
import type { SnackbarType } from '../types/types.ts';

const DEFAULT_STALE_TIME = 2 * 60 * 1000;
const DEFAULT_PAGE_SIZE = 10;

interface Detailish {
    detail: string;
}

export interface CrudGridOptions<
    T extends { id: number },
    TCreateVars, TCreateData extends Detailish,
    TUpdateVars, TUpdateData extends Detailish,
    TDeleteVars, TDeleteData,
> {
    queryKey: QueryKey;
    /** Zero-arg list fetch — `createCrudApi(...).fetchList` is already this shape. */
    fetchFn: () => Promise<T[]>;
    createFn: (vars: TCreateVars) => Promise<TCreateData>;
    updateFn: (vars: TUpdateVars) => Promise<TUpdateData>;
    deleteFn: (vars: TDeleteVars) => Promise<TDeleteData>;
    getString: GetStringFn;
    /**
     * Inline-editable field -> translation key, used for the confirm dialog's
     * "you are changing <label>" line. A field missing here falls back to its
     * own name, which is what the hand-written fieldLabelMaps did.
     */
    fieldLabels?: Record<string, string>;
    /** Sortable slices pass (a, b) => (a.sort_order - b.sort_order) || (a.id - b.id). */
    compare?: (a: T, b: T) => number;
    /**
     * Whether an inline cell edit / toggle goes through the confirm dialog.
     * Most slices do; a few (jobs) save straight away. Default true.
     */
    confirmEdits?: boolean;
    staleTime?: number;
    pageSize?: number;
}

export function useCrudGrid<
    T extends { id: number },
    TCreateVars, TCreateData extends Detailish,
    TUpdateVars, TUpdateData extends Detailish,
    TDeleteVars, TDeleteData,
>({
    queryKey,
    fetchFn,
    createFn,
    updateFn,
    deleteFn,
    getString,
    fieldLabels,
    compare,
    confirmEdits = true,
    staleTime = DEFAULT_STALE_TIME,
    pageSize = DEFAULT_PAGE_SIZE,
}: CrudGridOptions<T, TCreateVars, TCreateData, TUpdateVars, TUpdateData, TDeleteVars, TDeleteData>) {
    const [snackbar, setSnackbar] = useState<SnackbarType>({
        open: false,
        message: '',
        severity: 'success',
    });
    const [formOpen, setFormOpen] = useState(false);
    const [editingState, setEditingState] = useState<EditingState>({ userId: null, field: null });
    const [pendingEdit, setPendingEdit] = useState<PendingEdit | null>(null);
    const [rowToDelete, setRowToDelete] = useState<T | null>(null);
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize });

    const { data: fetched = [], isLoading, error } = useQuery({
        queryKey,
        queryFn: fetchFn,
        staleTime,
    });

    const rows = useMemo(
        () => (compare ? [...fetched].sort(compare) : fetched),
        [fetched, compare],
    );

    const { createMutation, updateMutation, deleteMutation } = useCrudMutations({
        queryKey,
        createFn,
        updateFn,
        deleteFn,
        setSnackbar,
        onCreateSuccess: () => setFormOpen(false),
        onUpdateSuccess: () => {
            setEditingState({ userId: null, field: null });
            setPendingEdit(null);
        },
        onDeleteSuccess: () => setRowToDelete(null),
        onDeleteError: () => setRowToDelete(null),
    });

    const localeText = useDataGridLocale();

    const handleEditFieldClick = useCallback((row: T, field: string, e: MouseEvent) => {
        e.stopPropagation();
        setEditingState({ userId: row.id, field });
    }, []);

    const handleRequestSave = useCallback(
        (row: T, field: string, newValue: string) => {
            if (!confirmEdits) {
                updateMutation.mutate({ id: row.id, data: { [field]: newValue } } as TUpdateVars);
                return;
            }
            const labelKey = fieldLabels?.[field];
            setPendingEdit({
                id: row.id,
                fieldLabel: (labelKey && getString(labelKey)) || field,
                field,
                newValue,
                oldValue: String((row as unknown as Record<string, unknown>)[field] ?? ''),
            });
        },
        [getString, fieldLabels, confirmEdits, updateMutation],
    );

    /**
     * Ask to flip a boolean column. Call sites stay one line:
     * `onToggleActive: (row) => requestToggle(row, 'is_active', 'isActive')`.
     */
    const requestToggle = useCallback(
        (row: T, field: string, labelKey: string, fallback?: string) => {
            const current = Boolean((row as unknown as Record<string, unknown>)[field]);
            if (!confirmEdits) {
                updateMutation.mutate({ id: row.id, data: { [field]: !current } } as TUpdateVars);
                return;
            }
            setPendingEdit({
                id: row.id,
                fieldLabel: getString(labelKey) || fallback || field,
                field,
                newValue: !current,
                oldValue: current,
            });
        },
        [getString, confirmEdits, updateMutation],
    );

    const handleConfirmEdit = useCallback(() => {
        if (!pendingEdit) return;
        updateMutation.mutate({
            id: pendingEdit.id,
            data: { [pendingEdit.field]: pendingEdit.newValue },
        } as TUpdateVars);
    }, [pendingEdit, updateMutation]);

    const handleCancelEdit = useCallback(() => {
        setEditingState({ userId: null, field: null });
    }, []);

    const handleCancelPending = useCallback(() => {
        setPendingEdit(null);
        setEditingState({ userId: null, field: null });
    }, []);

    const handleDeleteClick = useCallback((row: T) => setRowToDelete(row), []);

    const handleConfirmDelete = useCallback(() => {
        if (!rowToDelete) return;
        deleteMutation.mutate(rowToDelete.id as TDeleteVars);
    }, [rowToDelete, deleteMutation]);

    const closeSnackbar = useCallback(
        () => setSnackbar((p) => ({ ...p, open: false })),
        [],
    );

    return {
        rows,
        isLoading,
        error,
        localeText,
        snackbar,
        setSnackbar,
        closeSnackbar,
        formOpen,
        setFormOpen,
        editingState,
        pendingEdit,
        rowToDelete,
        setRowToDelete,
        paginationModel,
        setPaginationModel,
        createMutation,
        updateMutation,
        deleteMutation,
        handleEditFieldClick,
        handleRequestSave,
        requestToggle,
        handleConfirmEdit,
        handleCancelEdit,
        handleCancelPending,
        handleDeleteClick,
        handleConfirmDelete,
    };
}
