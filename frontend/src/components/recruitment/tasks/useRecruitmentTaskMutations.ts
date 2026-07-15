import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    createRecruitmentTask,
    updateRecruitmentTask,
    changeRecruitmentTaskStatus,
    deleteRecruitmentTask,
} from './recruitmentTaskApi';
import { RECRUITMENT_TASK_QK } from '../../../utils/queryKeys';

type Snackbar = { open: boolean; message: string; severity: 'success' | 'error' };

interface Props {
    setSnackbar: (s: Snackbar) => void;
    onCreateSuccess?: () => void;
}

export function useRecruitmentTaskMutations({ setSnackbar, onCreateSuccess }: Props) {
    const qc = useQueryClient();
    const invalidate = () => qc.invalidateQueries({ queryKey: RECRUITMENT_TASK_QK });

    const createMutation = useMutation({
        mutationFn: createRecruitmentTask,
        onSuccess: async (res) => {
            await invalidate();
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onCreateSuccess?.();
        },
        onError: (err: Error) => setSnackbar({ open: true, message: err.message, severity: 'error' }),
    });

    const updateMutation = useMutation({
        mutationFn: updateRecruitmentTask,
        onSuccess: async (res) => {
            await invalidate();
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
        },
        onError: (err: Error) => setSnackbar({ open: true, message: err.message, severity: 'error' }),
    });

    const statusMutation = useMutation({
        mutationFn: changeRecruitmentTaskStatus,
        onSuccess: async (res) => {
            await invalidate();
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
        },
        onError: (err: Error) => setSnackbar({ open: true, message: err.message, severity: 'error' }),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteRecruitmentTask,
        onSuccess: async (res) => {
            await invalidate();
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
        },
        onError: (err: Error) => setSnackbar({ open: true, message: err.message, severity: 'error' }),
    });

    return { createMutation, updateMutation, statusMutation, deleteMutation };
}
