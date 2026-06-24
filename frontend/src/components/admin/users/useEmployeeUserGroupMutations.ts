// src/components/admin/users/useEmployeeUserGroupMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    createEmployeeUserGroupLink,
    deleteEmployeeUserGroupLink,
} from './employeeUserGroupApi';
import { EMPLOYEE_USER_GROUP_QK } from '../../../utils/queryKeys.ts';
import type { SnackbarType } from '../../../types/types.ts';

interface Props {
    setSnackbar: (s: SnackbarType) => void;
    // Localised fallback for delete (DELETE returns no body)
    deleteSuccessMessage: string;
    onLinkSuccess?: () => void;
    onUnlinkSuccess?: () => void;
}

export function useEmployeeUserGroupMutations({
    setSnackbar,
    deleteSuccessMessage,
    onLinkSuccess,
    onUnlinkSuccess,
}: Props) {
    const qc = useQueryClient();

    const linkMutation = useMutation({
        mutationFn: createEmployeeUserGroupLink,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: EMPLOYEE_USER_GROUP_QK });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onLinkSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    const unlinkMutation = useMutation({
        mutationFn: deleteEmployeeUserGroupLink,
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: EMPLOYEE_USER_GROUP_QK });
            setSnackbar({ open: true, message: deleteSuccessMessage, severity: 'success' });
            onUnlinkSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    return { linkMutation, unlinkMutation };
}
