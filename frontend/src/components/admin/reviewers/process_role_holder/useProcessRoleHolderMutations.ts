// src/components/admin/reviewers/process_role_holder/useProcessRoleHolderMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PROCESS_ROLE_HOLDER_QK } from '../../../../utils/queryKeys.ts';
import {
    createProcessRoleHolder,
    deleteProcessRoleHolder,
} from './processRoleHolderApi';

type Snackbar = { open: boolean; message: string; severity: 'success' | 'error' };

interface Props {
    setSnackbar: (s: Snackbar) => void;
    onCreateSuccess?: () => void;
    onDeleteSuccess?: () => void;
    onDeleteError?: () => void;
}

export function useProcessRoleHolderMutations({
    setSnackbar,
    onCreateSuccess,
    onDeleteSuccess,
    onDeleteError,
}: Props) {
    const qc = useQueryClient();

    const createMutation = useMutation({
        mutationFn: createProcessRoleHolder,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: PROCESS_ROLE_HOLDER_QK });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onCreateSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteProcessRoleHolder,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: PROCESS_ROLE_HOLDER_QK });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onDeleteSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
            onDeleteError?.();
        },
    });

    return { createMutation, deleteMutation };
}
