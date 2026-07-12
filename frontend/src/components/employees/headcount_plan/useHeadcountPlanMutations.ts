// src/components/employees/headcount_plan/useHeadcountPlanMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    createHeadcountTarget,
    deleteHeadcountTarget,
    updateHeadcountTarget,
} from './headcountPlanApi';

type Snackbar = { open: boolean; message: string; severity: 'success' | 'error' };

interface Props {
    setSnackbar: (s: Snackbar) => void;
}

export function useHeadcountPlanMutations({ setSnackbar }: Props) {
    const qc = useQueryClient();

    const invalidateHeadcount = async () => {
        await Promise.all([
            qc.invalidateQueries({ queryKey: ['headcount_calc'] }),
            qc.invalidateQueries({ queryKey: ['headcount_targets'] }),
            qc.invalidateQueries({ queryKey: ['headcount_target_count_by_link'] }),
        ]);
    };

    const createTargetMutation = useMutation({
        mutationFn: createHeadcountTarget,
        onSuccess: async (res) => {
            await invalidateHeadcount();
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    const updateTargetMutation = useMutation({
        mutationFn: updateHeadcountTarget,
        onSuccess: async (res) => {
            await invalidateHeadcount();
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    const deleteTargetMutation = useMutation({
        mutationFn: deleteHeadcountTarget,
        onSuccess: async (detail) => {
            await invalidateHeadcount();
            setSnackbar({ open: true, message: detail, severity: 'success' });
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    return { createTargetMutation, updateTargetMutation, deleteTargetMutation };
}
