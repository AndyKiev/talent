// src/components/admin/employee_events/employee-event-statuses/useEmployeeEventStatusMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createEmployeeEventStatus,
  updateEmployeeEventStatus,
  deleteEmployeeEventStatus,
} from './employeeEventStatusApi';

type Snackbar = { open: boolean; message: string; severity: 'success' | 'error' };

export const EMPLOYEE_EVENT_STATUS_QK = ['employee_event_statuses'] as const;

interface Props {
  setSnackbar: (s: Snackbar) => void;
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
