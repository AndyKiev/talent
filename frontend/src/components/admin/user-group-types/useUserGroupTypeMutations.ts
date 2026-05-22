// src/components/admin/user-group-types/useUserGroupTypeMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    createUserGroupType,
    updateUserGroupType,
    deleteUserGroupType,
} from './userGroupTypeApi';

type Snackbar = { open: boolean; message: string; severity: 'success' | 'error' };

export const USER_GROUP_TYPE_QK = ['user_group_types'] as const;

interface Props {
    setSnackbar: (s: Snackbar) => void;
    onCreateSuccess?: () => void;
    onUpdateSuccess?: () => void;
    onDeleteSuccess?: () => void;
    onDeleteError?: () => void;
}

export function useUserGroupTypeMutations({
                                              setSnackbar,
                                              onCreateSuccess,
                                              onUpdateSuccess,
                                              onDeleteSuccess,
                                              onDeleteError,
                                          }: Props) {
    const qc = useQueryClient();

    const createMutation = useMutation({
        mutationFn: createUserGroupType,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: USER_GROUP_TYPE_QK });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onCreateSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    const updateMutation = useMutation({
        mutationFn: updateUserGroupType,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: USER_GROUP_TYPE_QK });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onUpdateSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteUserGroupType,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: USER_GROUP_TYPE_QK });
            setSnackbar({
                open: true,
                message: res.detail,
                severity: 'success',
            });
            onDeleteSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
            onDeleteError?.();
        },
    });

    return { createMutation, updateMutation, deleteMutation };
}