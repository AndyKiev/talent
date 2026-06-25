// src/components/employees/useEmployeeMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '../../api/axiosInstance';
import { BASE_URL } from '../../utils/eNums';
import {
    updateEmployee,
    deleteEmployee,
    type Employee,
    type EmployeeUpdate,
} from './employeeApi';
import type { EmployeeWithActivationPayload } from './EmployeeCreateDialog';

type Snackbar = { open: boolean; message: string; severity: 'success' | 'error' };

export const EMPLOYEES_QK = ['employees'] as const;
export const SCOPE_DEPARTMENTS_QK = ['employees', 'scope_departments'] as const;

interface Props {
    setSnackbar: (s: Snackbar) => void;
    onCreateSuccess?: () => void;
    onUpdateSuccess?: () => void;
    onDeleteSuccess?: () => void;
    onDeleteError?: () => void;
}

// ── API call for the orchestration endpoint ───────────────────────────────────

const createEmployeeWithActivation = async (
    payload: EmployeeWithActivationPayload,
): Promise<Employee> => {
    const res = await axiosInstance.post<Employee>(
        `${BASE_URL}/employees/with_activation`,
        payload,
    );
    return res.data;
};

export function useEmployeeMutations({
    setSnackbar,
    onCreateSuccess,
    onUpdateSuccess,
    onDeleteSuccess,
    onDeleteError,
}: Props) {
    const qc = useQueryClient();

    const invalidate = async () => {
        await qc.invalidateQueries({ queryKey: EMPLOYEES_QK });
    };

    // ── Create employee + activation (single backend call, atomic) ────────────

    const createMutation = useMutation({
        mutationFn: createEmployeeWithActivation,
        onSuccess: async () => {
            await invalidate();
            setSnackbar({ open: true, message: 'Employee created successfully', severity: 'success' });
            onCreateSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    // ── Update employee (name / email / is_active only) ───────────────────────

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: EmployeeUpdate }) =>
            updateEmployee({ id, data }),
        onSuccess: async () => {
            await invalidate();
            setSnackbar({ open: true, message: 'Employee updated successfully', severity: 'success' });
            onUpdateSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    // ── Delete employee ───────────────────────────────────────────────────────

    const deleteMutation = useMutation({
        mutationFn: ({ id, force }: { id: number; force?: boolean }) =>
            deleteEmployee(id, force ?? false),
        onSuccess: async (res) => {
            await invalidate();
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
