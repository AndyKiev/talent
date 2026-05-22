// src/components/admin/department_types/useDepartmentTypeJobLinkMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    createDepartmentTypeJobLink,
    updateDepartmentTypeJobLink,
    deleteDepartmentTypeJobLink,
    // type DepartmentTypeJobLinkCreate,
} from './departmentTypeJobLinkApi';

type Snackbar = { open: boolean; message: string; severity: 'success' | 'error' };

/** Query key factory — jobs for a given department type */
export const deptTypeJobsQK = (departmentTypeId: number) =>
    ['department_type_jobs', departmentTypeId] as const;

interface Props {
    setSnackbar: (s: Snackbar) => void;
    onCreateSuccess?: () => void;
    onUpdateSuccess?: () => void;
    onDeleteSuccess?: () => void;
}

export function useDepartmentTypeJobLinkMutations({
    setSnackbar,
    onCreateSuccess,
    onUpdateSuccess,
    onDeleteSuccess,
}: Props) {
    const qc = useQueryClient();

    const createLinkMutation = useMutation({
        mutationFn: createDepartmentTypeJobLink,
        onSuccess: async (res, variables) => {
            await qc.invalidateQueries({
                queryKey: deptTypeJobsQK(variables.department_type_id),
            });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onCreateSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    const updateLinkMutation = useMutation({
        mutationFn: updateDepartmentTypeJobLink,
        // onSuccess: async (res, variables) => {
        onSuccess: async (res) => {
            // We don't know the dept type ID here, so invalidate all job-link queries
            await qc.invalidateQueries({ queryKey: ['department_type_jobs'] });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onUpdateSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    const deleteLinkMutation = useMutation({
        mutationFn: ({
            linkId,
        }: {
            linkId: number;
            departmentTypeId: number;
        }) => deleteDepartmentTypeJobLink(linkId),
        onSuccess: async (res, variables) => {
            await qc.invalidateQueries({
                queryKey: deptTypeJobsQK(variables.departmentTypeId),
            });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onDeleteSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    return { createLinkMutation, updateLinkMutation, deleteLinkMutation };
}
