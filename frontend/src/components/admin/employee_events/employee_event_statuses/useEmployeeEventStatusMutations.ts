// src/components/admin/employee_events/employee-event-statuses/useEmployeeEventStatusMutations.ts
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {
  createEmployeeEventStatus,
  deleteEmployeeEventStatus,
  updateEmployeeEventStatus,
} from './employeeEventStatusApi';
import {EMPLOYEE_EVENT_STATUS_QK} from "../../../../utils/queryKeys.ts";
import type {SnackbarType} from "../../../../types/types.ts";

interface Props {
  setSnackbar: (s: SnackbarType) => void;
  onCreateSuccess?: () => void;
  onUpdateSuccess?: () => void;
  onDeleteSuccess?: () => void;
  onDeleteError?: () => void;
}

export function useEmployeeEventStatusMutations({
  setSnackbar,
  onCreateSuccess,
  onUpdateSuccess,
  onDeleteSuccess,
  onDeleteError,
}: Props) {
  const qc = useQueryClient();

  const createMutation = useMutation({
    mutationFn: createEmployeeEventStatus,
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: EMPLOYEE_EVENT_STATUS_QK });
      setSnackbar({ open: true, message: res.detail, severity: 'success' });
      onCreateSuccess?.();
    },
    onError: (err: Error) => {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateEmployeeEventStatus,
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: EMPLOYEE_EVENT_STATUS_QK });
      setSnackbar({ open: true, message: res.detail, severity: 'success' });
      onUpdateSuccess?.();
    },
    onError: (err: Error) => {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEmployeeEventStatus,
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: EMPLOYEE_EVENT_STATUS_QK });
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
