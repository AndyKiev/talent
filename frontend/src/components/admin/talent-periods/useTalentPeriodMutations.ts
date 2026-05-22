// src/components/admin/talent-periods/useTalentPeriodMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    createTalentPeriod,
    updateTalentPeriod,
    deleteTalentPeriod,
} from './talentPeriodApi';

type Snackbar = { open: boolean; message: string; severity: 'success' | 'error' };

export const TALENT_PERIOD_QK = ['talent_periods'] as const;

interface Props {
    setSnackbar: (s: Snackbar) => void;
    onCreateSuccess?: () => void;
    onUpdateSuccess?: () => void;
    onDeleteSuccess?: () => void;
    onDeleteError?: () => void;
}

export function useTalentPeriodMutations({
                                             setSnackbar,
                                             onCreateSuccess,
                                             onUpdateSuccess,
                                             onDeleteSuccess,
                                             onDeleteError,
                                         }: Props) {
    const qc = useQueryClient();

    const createMutation = useMutation({
        mutationFn: createTalentPeriod,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: TALENT_PERIOD_QK });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onCreateSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    const updateMutation = useMutation({
        mutationFn: updateTalentPeriod,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: TALENT_PERIOD_QK });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onUpdateSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteTalentPeriod,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: TALENT_PERIOD_QK });
            setSnackbar({
                open: true,
                message: res.detail,
                severity: 'success',
            });
            onDeleteSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
            onDeleteError?.();
        },
    });

    return { createMutation, updateMutation, deleteMutation };
}