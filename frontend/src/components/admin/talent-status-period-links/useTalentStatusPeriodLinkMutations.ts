// src/components/admin/talent-status-period-links/useTalentStatusPeriodLinkMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    createTalentStatusPeriodLink,
    updateTalentStatusPeriodLink,
    deleteTalentStatusPeriodLink,
} from './talentStatusPeriodLinkApi';

type Snackbar = { open: boolean; message: string; severity: 'success' | 'error' };

export const TSPL_QK = ['talent_status_period_links'] as const;

interface Props {
    setSnackbar: (s: Snackbar) => void;
    onCreateSuccess?: () => void;
    onUpdateSuccess?: () => void;
    onDeleteSuccess?: () => void;
    onDeleteError?: () => void;
}

export function useTalentStatusPeriodLinkMutations({
                                                       setSnackbar,
                                                       onCreateSuccess,
                                                       onUpdateSuccess,
                                                       onDeleteSuccess,
                                                       onDeleteError,
                                                   }: Props) {
    const qc = useQueryClient();

    const createMutation = useMutation({
        mutationFn: createTalentStatusPeriodLink,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: TSPL_QK });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onCreateSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    const updateMutation = useMutation({
        mutationFn: updateTalentStatusPeriodLink,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: TSPL_QK });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onUpdateSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteTalentStatusPeriodLink,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: TSPL_QK });
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