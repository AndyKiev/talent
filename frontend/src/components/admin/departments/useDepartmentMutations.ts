// src/components/admin/departments/useDepartmentMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from './departmentApi';
import { DEPARTMENT_ROOTS_QK } from './DepartmentTree';

type Snackbar = { open: boolean; message: string; severity: 'success' | 'error' };

export const DEPARTMENT_TREE_QK = ['department_tree'] as const;
export const DEPARTMENT_FLAT_QK = ['departments_flat'] as const;

interface Props {
  setSnackbar: (s: Snackbar) => void;
  onCreateSuccess?: () => void;
  onUpdateSuccess?: () => void;
  onDeleteSuccess?: () => void;
  onDeleteError?: () => void;
}

export function useDepartmentMutations({
                                         setSnackbar,
                                         onCreateSuccess,
                                         onUpdateSuccess,
                                         onDeleteSuccess,
                                         onDeleteError,
                                       }: Props) {
  const qc = useQueryClient();

  const invalidateAll = async () => {
    await qc.invalidateQueries({ queryKey: DEPARTMENT_TREE_QK });
    await qc.invalidateQueries({ queryKey: DEPARTMENT_FLAT_QK });
    // Keep the roots badge in sync after create / delete
    await qc.invalidateQueries({ queryKey: DEPARTMENT_ROOTS_QK });
  };

  const createMutation = useMutation({
    mutationFn: createDepartment,
    onSuccess: async (res) => {
      await invalidateAll();
      setSnackbar({ open: true, message: res.detail, severity: 'success' });
      onCreateSuccess?.();
    },
    onError: (err: Error) => {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateDepartment,
    onSuccess: async (res) => {
      await invalidateAll();
      setSnackbar({ open: true, message: res.detail, severity: 'success' });
      onUpdateSuccess?.();
    },
    onError: (err: Error) => {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDepartment,
    onSuccess: async (res) => {
      await invalidateAll();
      setSnackbar({ open: true, message: res.detail, severity: 'success' });
      onDeleteSuccess?.();
    },
    onError: (err: Error) => {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
      onDeleteError?.();
    },
  });

  return { createMutation, updateMutation, deleteMutation };
}