import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    createCandidate,
    updateCandidate,
    deleteCandidate,
} from './candidateApi';
import { CANDIDATE_QK } from '../../utils/queryKeys';

type Snackbar = { open: boolean; message: string; severity: 'success' | 'error' };

interface Props {
    setSnackbar: (s: Snackbar) => void;
    onCreateSuccess?: () => void;
    onUpdateSuccess?: () => void;
}

export function useCandidateMutations({ setSnackbar, onCreateSuccess, onUpdateSuccess }: Props) {
    const qc = useQueryClient();
    const invalidate = () => qc.invalidateQueries({ queryKey: CANDIDATE_QK });

    const createMutation = useMutation({
        mutationFn: createCandidate,
        onSuccess: async (res) => {
            await invalidate();
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onCreateSuccess?.();
        },
        onError: (err: Error) => setSnackbar({ open: true, message: err.message, severity: 'error' }),
    });

    const updateMutation = useMutation({
        mutationFn: updateCandidate,
        onSuccess: async (res) => {
            await invalidate();
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onUpdateSuccess?.();
        },
        onError: (err: Error) => setSnackbar({ open: true, message: err.message, severity: 'error' }),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteCandidate,
        onSuccess: async (res) => {
            await invalidate();
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
        },
        onError: (err: Error) => setSnackbar({ open: true, message: err.message, severity: 'error' }),
    });

    return { createMutation, updateMutation, deleteMutation };
}
