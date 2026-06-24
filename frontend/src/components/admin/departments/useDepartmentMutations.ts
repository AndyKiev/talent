// src/components/admin/departments/useDepartmentMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createDepartment,
  updateDepartment,
  deleteDepartment,
  generateDepartmentSubtree,
} from './departmentApi';
import {DEPARTMENT_ROOTS_QK, DEPARTMENT_TREE_QK, DEPARTMENT_FLAT_QK} from "../../../utils/queryKeys.ts";
import type {SnackbarType} from "../../../types/types.ts";

interface Props {
  setSnackbar: (s: SnackbarType) => void;
  onCreateSuccess?: () => void;
  onUpdateSuccess?: () => void;
  onDeleteSuccess?: () => void;
  onDeleteError?: () => void;
  onGenerateSuccess?: () => void;
  onGenerateError?: () => void;
}

export function useDepartmentMutations({
                                         setSnackbar,
                                         onCreateSuccess,
                                         onUpdateSuccess,
                                         onDeleteSuccess,
                                         onDeleteError,
                                         onGenerateSuccess,
                                         onGenerateError,
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

  const generateSubtreeMutation = useMutation({
    mutationFn: generateDepartmentSubtree,
    onSuccess: async (res) => {
      await invalidateAll();
      setSnackbar({ open: true, message: res.detail, severity: 'success' });
      onGenerateSuccess?.();
    },
    onError: (err: Error) => {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
      onGenerateError?.();
    },
  });

  return { createMutation, updateMutation, deleteMutation, generateSubtreeMutation };
}