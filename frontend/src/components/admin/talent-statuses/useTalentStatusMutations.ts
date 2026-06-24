// src/components/admin/talent-statuses/useTalentStatusMutations.ts
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {createTalentStatus, deleteTalentStatus, updateTalentStatus,} from './talentStatusApi';
import {TALENT_STATUS_QK} from "../../../utils/queryKeys.ts";
import type {SnackbarType} from "../../../types/types.ts";

interface Props {
  setSnackbar: (s: SnackbarType) => void;
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
