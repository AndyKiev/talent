// src/components/admin/persons/usePersonMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createPerson, deletePerson, updatePerson } from './personApi';
import { PERSON_QK } from '../../../utils/queryKeys.ts';
import { EMPLOYEES_QK } from '../../employees/useEmployeeMutations';
import type { SnackbarType } from '../../../types/types.ts';

interface Props {
    setSnackbar: (s: SnackbarType) => void;
    onCreateSuccess?: () => void;
    onUpdateSuccess?: () => void;
    onDeleteSuccess?: () => void;
    onDeleteError?: () => void;
}

export function usePersonMutations({
    setSnackbar,
    onCreateSuccess,
    onUpdateSuccess,
    onDeleteSuccess,
    onDeleteError,
}: Props) {
    const qc = useQueryClient();

    // Person renames rebuild the linked employees.name server-side, so the
    // employees grid must be refetched together with the persons grid.
    const invalidate = async () => {
        await qc.invalidateQueries({ queryKey: PERSON_QK });
        await qc.invalidateQueries({ queryKey: EMPLOYEES_QK });
    };

    const createMutation = useMutation({
        mutationFn: createPerson,
        onSuccess: async (res) => {
            await invalidate();
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onCreateSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    const updateMutation = useMutation({
        mutationFn: updatePerson,
        onSuccess: async (res) => {
            await invalidate();
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onUpdateSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deletePerson,
        onSuccess: async (res) => {
            await invalidate();
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onDeleteSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
            onDeleteError?.();
        },
    });

    return { createMutation, updateMutation, deleteMutation };
}
