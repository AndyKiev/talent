// src/components/admin/talent-statuses/useTalentStatusMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createTalentStatus,
  updateTalentStatus,
  deleteTalentStatus,
} from './talentStatusApi';

type Snackbar = { open: boolean; message: string; severity: 'success' | 'error' };

export const TALENT_STATUS_QK = ['talent_statuses'] as const;

interface Props {
  setSnackbar: (s: Snackbar) => void;
  onCreateSuccess?: () => void;
  onUpdateSuccess?: () => void;
  onDeleteSuccess?: () => void;
  onDeleteError?: () => void;
}

export function useTalentStatusMutations({
  setSnackbar,
  onCreateSuccess,
  onUpdateSuccess,
  onDeleteSuccess,
  onDeleteError,
}: Props) {
  const qc = useQueryClient();

  const createMutation = useMutation({
    mutationFn: createTalentStatus,
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: TALENT_STATUS_QK });
      setSnackbar({ open: true, message: res.detail, severity: 'success' });
      onCreateSuccess?.();
    },
    onError: (err: Error) => {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateTalentStatus,
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: TALENT_STATUS_QK });
      setSnackbar({ open: true, message: res.detail, severity: 'success' });
      onUpdateSuccess?.();
    },
    onError: (err: Error) => {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTalentStatus,
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: TALENT_STATUS_QK });
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
