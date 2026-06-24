// src/components/admin/departments/useDepartmentRegionLinkMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    createDepartmentRegionLink,
    deleteDepartmentRegionLink,
    updateDepartmentRegionLink,
} from './departmentRegionLinkApi';
import { DEPARTMENT_REGION_LINK_QK } from '../../../utils/queryKeys.ts';
import type { SnackbarType } from '../../../types/types.ts';

interface Props {
    setSnackbar: (s: SnackbarType) => void;
    onCreateSuccess?: () => void;
    onUpdateSuccess?: () => void;
    onDeleteSuccess?: () => void;
    onDeleteError?: () => void;
}

export function useDepartmentRegionLinkMutations({
    setSnackbar,
    onCreateSuccess,
    onUpdateSuccess,
    onDeleteSuccess,
    onDeleteError,
}: Props) {
    const qc = useQueryClient();

    const createMutation = useMutation({
        mutationFn: createDepartmentRegionLink,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: DEPARTMENT_REGION_LINK_QK });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onCreateSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    const updateMutation = useMutation({
        mutationFn: updateDepartmentRegionLink,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: DEPARTMENT_REGION_LINK_QK });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onUpdateSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteDepartmentRegionLink,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: DEPARTMENT_REGION_LINK_QK });
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
