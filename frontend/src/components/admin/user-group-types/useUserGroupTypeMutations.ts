// src/components/admin/user-group-types/useUserGroupTypeMutations.ts
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {createUserGroupType, deleteUserGroupType, updateUserGroupType,} from './userGroupTypeApi';
import {USER_GROUP_TYPE_QK} from "../../../utils/queryKeys.ts";
import type {SnackbarType} from "../../../types/types.ts";


interface Props {
    setSnackbar: (s: SnackbarType) => void;
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