// src/components/admin/essences/useEssenceMutations.ts
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {createEssence, deleteEssence, updateEssence} from './essenceApi';
import {ESSENCE_QK} from "../../../utils/queryKeys.ts";
import type {SnackbarType} from "../../../types/types.ts";

interface Params {
  setSnackbar: (s: SnackbarType) => void;
  onCreateSuccess?: () => void;
  onUpdateSuccess?: () => void;
  onDeleteSuccess?: () => void;
}

export function useEssenceMutations({
  setSnackbar,
  onCreateSuccess,
  onUpdateSuccess,
  onDeleteSuccess,
}: Params) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ESSENCE_QK });

  const createMutation = useMutation({
    mutationFn: createEssence,
    onSuccess: (res) => {
      invalidate();
      setSnackbar({ open: true, message: res.detail, severity: 'success' });
      onCreateSuccess?.();
    },
    onError: () =>
      setSnackbar({ open: true, message: 'Error creating essence', severity: 'error' }),
  });

  const updateMutation = useMutation({
    mutationFn: updateEssence,
    onSuccess: (res) => {
      invalidate();
      setSnackbar({ open: true, message: res.detail, severity: 'success' });
      onUpdateSuccess?.();
    },
    onError: () =>
      setSnackbar({ open: true, message: 'Error updating essence', severity: 'error' }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEssence,
    onSuccess: () => {
      invalidate();
      setSnackbar({ open: true, message: 'Essence deleted', severity: 'success' });
      onDeleteSuccess?.();
    },
    onError: () =>
      setSnackbar({ open: true, message: 'Error deleting essence', severity: 'error' }),
  });

  return { createMutation, updateMutation, deleteMutation };
}
