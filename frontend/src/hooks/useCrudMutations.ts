// src/hooks/useCrudMutations.ts
//
// Generic create/update/delete mutation trio every essence slice repeats:
// each mutation invalidates the slice's list query, shows the backend `detail`
// in the snackbar on success / the error message on failure, and fires the
// caller's optional callback. Slice hooks (useXMutations) become thin wrappers
// so their consumers keep the exact same API.
//
// Sortable slices add the optional move mutation via useMoveMutation.
import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import type { SnackbarType } from '../types/types.ts';

/** The standard callback surface of a slice's useXMutations hook. */
export interface CrudMutationCallbacks {
    setSnackbar: (s: SnackbarType) => void;
    onCreateSuccess?: () => void;
    onUpdateSuccess?: () => void;
    onDeleteSuccess?: () => void;
    onDeleteError?: () => void;
    onMoveError?: () => void;
}

interface Detailish {
    detail: string;
}

interface CrudMutationOptions<
    TCreateVars, TCreateData extends Detailish,
    TUpdateVars, TUpdateData extends Detailish,
    TDeleteVars, TDeleteData,
> extends CrudMutationCallbacks {
    /** List query key to invalidate after every successful mutation. */
    queryKey: QueryKey;
    createFn: (vars: TCreateVars) => Promise<TCreateData>;
    updateFn: (vars: TUpdateVars) => Promise<TUpdateData>;
    deleteFn: (vars: TDeleteVars) => Promise<TDeleteData>;
}

export function useCrudMutations<
    TCreateVars, TCreateData extends Detailish,
    TUpdateVars, TUpdateData extends Detailish,
    TDeleteVars, TDeleteData,
>({
    queryKey,
    createFn,
    updateFn,
    deleteFn,
    setSnackbar,
    onCreateSuccess,
    onUpdateSuccess,
    onDeleteSuccess,
    onDeleteError,
}: CrudMutationOptions<TCreateVars, TCreateData, TUpdateVars, TUpdateData, TDeleteVars, TDeleteData>) {
    const qc = useQueryClient();

    const success = async (detail: string, cb?: () => void) => {
        await qc.invalidateQueries({ queryKey });
        setSnackbar({ open: true, message: detail, severity: 'success' });
        cb?.();
    };
    const failure = (err: Error, cb?: () => void) => {
        setSnackbar({ open: true, message: err.message, severity: 'error' });
        cb?.();
    };

    const createMutation = useMutation({
        mutationFn: createFn,
        onSuccess: (res) => success(res.detail, onCreateSuccess),
        onError: (err: Error) => failure(err),
    });

    const updateMutation = useMutation({
        mutationFn: updateFn,
        onSuccess: (res) => success(res.detail, onUpdateSuccess),
        onError: (err: Error) => failure(err),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteFn,
        // Legacy void-deletes carry no detail — fall back to a generic message
        // resolved by the backend elsewhere; MutationResponse deletes have one.
        onSuccess: (res) => success((res as Detailish | undefined)?.detail ?? '', onDeleteSuccess),
        onError: (err: Error) => failure(err, onDeleteError),
    });

    return { createMutation, updateMutation, deleteMutation };
}

/** The optional reorder mutation of sortable slices (see /fe-sorting2). */
export function useMoveMutation<TMoveVars, TMoveData extends Detailish>({
    queryKey,
    moveFn,
    setSnackbar,
    onMoveError,
}: {
    queryKey: QueryKey;
    moveFn: (vars: TMoveVars) => Promise<TMoveData>;
    setSnackbar: (s: SnackbarType) => void;
    onMoveError?: () => void;
}) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: moveFn,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
            onMoveError?.();
        },
    });
}
