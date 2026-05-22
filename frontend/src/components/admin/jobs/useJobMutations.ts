// src/components/admin/jobs/useJobMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createJob, updateJob, deleteJob, setJobGroups } from './jobApi';

type Snackbar = { open: boolean; message: string; severity: 'success' | 'error' };

export const JOB_QK = ['jobs'] as const;
export const USER_GROUPS_QK = ['user_groups'] as const;

interface Props {
  setSnackbar: (s: Snackbar) => void;
  onCreateSuccess?: () => void;
  onUpdateSuccess?: () => void;
  onDeleteSuccess?: () => void;
  onDeleteError?: () => void;
  onSetGroupsSuccess?: () => void;
}

export function useJobMutations({
  setSnackbar,
  onCreateSuccess,
  onUpdateSuccess,
  onDeleteSuccess,
  onDeleteError,
  onSetGroupsSuccess,
}: Props) {
  const qc = useQueryClient();

  const createMutation = useMutation({
    mutationFn: createJob,
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: JOB_QK });
      setSnackbar({ open: true, message: res.detail, severity: 'success' });
      onCreateSuccess?.();
    },
    onError: (err: Error) => {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateJob,
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: JOB_QK });
      setSnackbar({ open: true, message: res.detail, severity: 'success' });
      onUpdateSuccess?.();
    },
    onError: (err: Error) => {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteJob,
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: JOB_QK });
      setSnackbar({ open: true, message: res.detail, severity: 'success' });
      onDeleteSuccess?.();
    },
    onError: (err: Error) => {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
      onDeleteError?.();
    },
  });

  const setGroupsMutation = useMutation({
    mutationFn: setJobGroups,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: JOB_QK });
      onSetGroupsSuccess?.();
    },
    onError: (err: Error) => {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    },
  });

  return { createMutation, updateMutation, deleteMutation, setGroupsMutation };
}
