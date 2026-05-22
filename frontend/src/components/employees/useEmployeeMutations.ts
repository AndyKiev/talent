// src/components/employees/useEmployeeMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    createEmployee,
    updateEmployee,
    deleteEmployee,
    type EmployeeCreate,
    type EmployeeUpdate,
} from './employeeApi';
import { createEmployeeDepartment } from './employeeDepartmentApi';

type Snackbar = { open: boolean; message: string; severity: 'success' | 'error' };

export const EMPLOYEES_QK = ['employees'] as const;

interface Props {
    setSnackbar: (s: Snackbar) => void;
    onCreateSuccess?: () => void;
    onUpdateSuccess?: () => void;
    onDeleteSuccess?: () => void;
    onDeleteError?: () => void;
}

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

    // ── Create employee + attach main department (two sequential calls) ────────

    const createMutation = useMutation({
        mutationFn: async ({
            employeeData,
            departmentId,
        }: {
            employeeData: EmployeeCreate;
            departmentId: number;
        }) => {
            const employee = await createEmployee(employeeData);
            await createEmployeeDepartment(employee.id, {
                department_id: departmentId,
                is_main: true,
            });
            return employee;
        },
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
        mutationFn: deleteEmployee,
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
