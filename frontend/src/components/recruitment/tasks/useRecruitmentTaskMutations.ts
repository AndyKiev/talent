import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    createRecruitmentTask,
    updateRecruitmentTask,
    changeRecruitmentTaskStatus,
    deleteRecruitmentTask,
} from './recruitmentTaskApi';
import { RECRUITMENT_TASK_QK } from '../../../utils/queryKeys';
import { useCrudMutations } from '../../../hooks/useCrudMutations';

type Snackbar = { open: boolean; message: string; severity: 'success' | 'error' };

interface Props {
    setSnackbar: (s: Snackbar) => void;
    onCreateSuccess?: () => void;
}

export function useRecruitmentTaskMutations({ setSnackbar, onCreateSuccess }: Props) {
    const qc = useQueryClient();
    const invalidate = () => qc.invalidateQueries({ queryKey: RECRUITMENT_TASK_QK });

    const { createMutation, updateMutation, deleteMutation } = useCrudMutations({
        queryKey: RECRUITMENT_TASK_QK,
        createFn: createRecruitmentTask,
        updateFn: updateRecruitmentTask,
        deleteFn: deleteRecruitmentTask,
        setSnackbar,
        onCreateSuccess,
    });

    const statusMutation = useMutation({
        mutationFn: changeRecruitmentTaskStatus,
        onSuccess: async (res) => {
            await invalidate();
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
        },
        onError: (err: Error) =>
            setSnackbar({ open: true, message: err.message, severity: 'error' }),
    });

    return { createMutation, updateMutation, statusMutation, deleteMutation };
}
