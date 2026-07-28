// src/components/admin/user_groups/useUserGroupMutations.ts
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {createUserGroup, deleteUserGroup, updateUserGroup} from './userGroupApi';
import {USER_GROUP_QK} from "../../../utils/queryKeys.ts";
import type {SnackbarType} from "../../../types/types.ts";



interface Props {
    setSnackbar: (s: SnackbarType) => void;
    // Localised fallback for delete success (pass getString('userGroupDeleteSuccess') || '...')
    deleteSuccessMessage: string;
    onCreateSuccess?: () => void;
    onUpdateSuccess?: () => void;
    onDeleteSuccess?: () => void;
    onDeleteError?: () => void;
}

export function useUserGroupMutations({
                                          setSnackbar,
                                          deleteSuccessMessage,
                                          onCreateSuccess,
                                          onUpdateSuccess,
                                          onDeleteSuccess,
                                          onDeleteError,
                                      }: Props) {
    const qc = useQueryClient();

    const createMutation = useMutation({
        mutationFn: createUserGroup,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: USER_GROUP_QK });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onCreateSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    const updateMutation = useMutation({
        mutationFn: updateUserGroup,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: USER_GROUP_QK });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onUpdateSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    // DELETE returns 204 — no body, so we use a localised fallback message
    const deleteMutation = useMutation({
        mutationFn: deleteUserGroup,
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: USER_GROUP_QK });
            setSnackbar({ open: true, message: deleteSuccessMessage, severity: 'success' });
            onDeleteSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
            onDeleteError?.();
        },
    });

    return { createMutation, updateMutation, deleteMutation };
}
