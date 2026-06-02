// src/components/admin/job_groups/useJobGroupMutations.ts
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {createJobGroup, deleteJobGroup, updateJobGroup} from './jobGroupApi';
import {JOB_GROUP_QK} from "../../../utils/queryKeys.ts";
import type {SnackbarType} from "../../../types/types.ts";


interface Props {
  setSnackbar: (s: SnackbarType) => void;
  deleteSuccessMessage: string;
  onCreateSuccess?: () => void;
  onUpdateSuccess?: () => void;
  onDeleteSuccess?: () => void;
  onDeleteError?: () => void;
}

export function useJobGroupMutations({
  setSnackbar,
  deleteSuccessMessage,
  onCreateSuccess,
  onUpdateSuccess,
  onDeleteSuccess,
  onDeleteError,
}: Props) {
  const qc = useQueryClient();

  const createMutation = useMutation({
    mutationFn: createJobGroup,
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: JOB_GROUP_QK });
      setSnackbar({ open: true, message: res.detail, severity: 'success' });
      onCreateSuccess?.();
    },
    onError: (err: Error) => {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateJobGroup,
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: JOB_GROUP_QK });
      setSnackbar({ open: true, message: res.detail, severity: 'success' });
      onUpdateSuccess?.();
    },
    onError: (err: Error) => {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteJobGroup,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: JOB_GROUP_QK });
      setSnackbar({ open: true, message: deleteSuccessMessage, severity: 'success' });
      onDeleteSuccess?.();
    },
    onError: (err: Error) => {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
      onDeleteError?.();
    },
  });

  return { createMutation, updateMutation, deleteMutation };
}
