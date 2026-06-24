// src/components/admin/operations/useOperationMutations.ts
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {createOperation, deleteOperation, updateOperation} from './operationApi.ts';
import {OPERATION_QK} from "../../../../utils/queryKeys.ts";
import type {SnackbarType} from "../../../../types/types.ts";

interface Params {
  setSnackbar: (s: SnackbarType) => void;
  onCreateSuccess?: () => void;
  onUpdateSuccess?: () => void;
  onDeleteSuccess?: () => void;
}

export function useOperationMutations({
  setSnackbar,
  onCreateSuccess,
  onUpdateSuccess,
  onDeleteSuccess,
}: Params) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: OPERATION_QK });

  const createMutation = useMutation({
    mutationFn: createOperation,
    onSuccess: async (res) => {
      await invalidate();
      setSnackbar({ open: true, message: res.detail, severity: 'success' });
      onCreateSuccess?.();
    },
    onError: () =>
      setSnackbar({ open: true, message: 'Error creating operation', severity: 'error' }),
  });

  const updateMutation = useMutation({
    mutationFn: updateOperation,
    onSuccess: async (res) => {
      await invalidate();
      setSnackbar({ open: true, message: res.detail, severity: 'success' });
      onUpdateSuccess?.();
    },
    onError: () =>
      setSnackbar({ open: true, message: 'Error updating operation', severity: 'error' }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteOperation,
    onSuccess: async () => {
      await invalidate();
      setSnackbar({ open: true, message: 'Operation deleted', severity: 'success' });
      onDeleteSuccess?.();
    },
    onError: () =>
      setSnackbar({ open: true, message: 'Error deleting operation', severity: 'error' }),
  });

  return { createMutation, updateMutation, deleteMutation };
}
