// src/components/admin/talent-status-period-links/useTalentStatusPeriodLinkMutations.ts
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {
    createTalentStatusPeriodLink,
    deleteTalentStatusPeriodLink,
    updateTalentStatusPeriodLink,
} from './talentStatusPeriodLinkApi';
import {TSPL_QK} from "../../../utils/queryKeys.ts";
import type {SnackbarType} from "../../../types/types.ts";

interface Props {
    setSnackbar: (s: SnackbarType) => void;
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