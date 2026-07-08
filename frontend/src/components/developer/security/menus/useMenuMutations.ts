// src/components/developer/security/menus/useMenuMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createMenu, deleteMenu, updateMenu } from './menuAdminApi';
import {
    MENUS_MANAGE_QK,
    MENUS_MY_QK,
    MENUS_ALL_QK,
} from '../../../../utils/queryKeys';
import type { SnackbarType } from '../../../../types/types';

interface Props {
    setSnackbar: (s: SnackbarType) => void;
    deleteSuccessMessage: string;
    onCreateSuccess?: () => void;
    onUpdateSuccess?: () => void;
    onDeleteSuccess?: () => void;
    onDeleteError?: () => void;
}

export function useMenuMutations({
    setSnackbar,
    deleteSuccessMessage,
    onCreateSuccess,
    onUpdateSuccess,
    onDeleteSuccess,
    onDeleteError,
}: Props) {
    const qc = useQueryClient();

    // Any change to menus affects the editor list AND the live navigation.
    const invalidateAll = async () => {
        await Promise.all([
            qc.invalidateQueries({ queryKey: MENUS_MANAGE_QK }),
            qc.invalidateQueries({ queryKey: MENUS_MY_QK }),
            qc.invalidateQueries({ queryKey: MENUS_ALL_QK }),
        ]);
    };

    const createMutation = useMutation({
        mutationFn: createMenu,
        onSuccess: async (res) => {
            await invalidateAll();
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onCreateSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    const updateMutation = useMutation({
        mutationFn: updateMenu,
        onSuccess: async (res) => {
            await invalidateAll();
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onUpdateSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteMenu,
        onSuccess: async () => {
            await invalidateAll();
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
