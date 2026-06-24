// src/components/admin/hrm_scopes/useHrmScopeMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    createHrmScope,
    updateHrmScope,
    deleteHrmScope,
} from './hrmScopeApi';
import { HRM_SCOPE_QK, HRM_EMPLOYEE_QK } from '../../../utils/queryKeys.ts';
import type { SnackbarType } from '../../../types/types.ts';

interface Props {
    setSnackbar: (s: SnackbarType) => void;
    deleteSuccessMessage: string;
    onSuccess?: () => void;
}

export function useHrmScopeMutations({
    setSnackbar,
    deleteSuccessMessage,
    onSuccess,
}: Props) {
    const qc = useQueryClient();

    const invalidate = async () => {
        await Promise.all([
            qc.invalidateQueries({ queryKey: HRM_SCOPE_QK }),
            qc.invalidateQueries({ queryKey: HRM_EMPLOYEE_QK }),
        ]);
    };

    const createMutation = useMutation({
        mutationFn: createHrmScope,
        onSuccess: async (res) => {
            await invalidate();
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onSuccess?.();
        },
        onError: (err: Error) =>
            setSnackbar({ open: true, message: err.message, severity: 'error' }),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, body }: { id: number; body: Parameters<typeof updateHrmScope>[1] }) =>
            updateHrmScope(id, body),
        onSuccess: async (res) => {
            await invalidate();
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onSuccess?.();
        },
        onError: (err: Error) =>
            setSnackbar({ open: true, message: err.message, severity: 'error' }),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteHrmScope,
        onSuccess: async () => {
            await invalidate();
            setSnackbar({ open: true, message: deleteSuccessMessage, severity: 'success' });
            onSuccess?.();
        },
        onError: (err: Error) =>
            setSnackbar({ open: true, message: err.message, severity: 'error' }),
    });

    return { createMutation, updateMutation, deleteMutation };
}
