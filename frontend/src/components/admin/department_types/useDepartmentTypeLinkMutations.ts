// src/components/admin/department_types/useDepartmentTypeLinkMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    createParentalLink,
    updateParentalLink,
    deleteParentalLink,
} from './departmentTypeParentalLinkApi.ts';

type Snackbar = { open: boolean; message: string; severity: 'success' | 'error' };

/** Query key factory — children for a given parent type */
export const deptTypeChildrenQK = (parentId: number) =>
    ['department_type_children', parentId] as const;

interface MoveVars {
    linkId: number;
    newParentId: number;
    oldParentId: number;
}

interface ToggleLinkVars {
    linkId: number;
    parentId: number;
    isActive: boolean;
}

interface Props {
    setSnackbar: (s: Snackbar) => void;
    onCreateSuccess?: () => void;
    onUpdateSuccess?: () => void;
    onToggleSuccess?: () => void;
    onDeleteSuccess?: () => void;
}

export function useDepartmentTypeLinkMutations({
    setSnackbar,
    onCreateSuccess,
    onUpdateSuccess,
    onToggleSuccess,
    onDeleteSuccess,
}: Props) {
    const qc = useQueryClient();

    const createLinkMutation = useMutation({
        mutationFn: createParentalLink,
        onSuccess: async (res, variables) => {
            // Invalidate the children list for the parent that just got a new child
            await qc.invalidateQueries({ queryKey: deptTypeChildrenQK(variables.parent_id) });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onCreateSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    // Move a child to a new parent: patch the link's parent_id, then refresh
    // both the old and the new parent's children lists.
    const updateLinkMutation = useMutation({
        mutationFn: ({ linkId, newParentId }: MoveVars) =>
            updateParentalLink({ linkId, data: { parent_id: newParentId } }),
        onSuccess: async (res, variables) => {
            await Promise.all([
                qc.invalidateQueries({ queryKey: deptTypeChildrenQK(variables.oldParentId) }),
                qc.invalidateQueries({ queryKey: deptTypeChildrenQK(variables.newParentId) }),
            ]);
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onUpdateSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    // Toggle a link's is_active flag (does not change parentage).
    const toggleLinkActiveMutation = useMutation({
        mutationFn: ({ linkId, isActive }: ToggleLinkVars) =>
            updateParentalLink({ linkId, data: { is_active: isActive } }),
        onSuccess: async (res, variables) => {
            await qc.invalidateQueries({ queryKey: deptTypeChildrenQK(variables.parentId) });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onToggleSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    const deleteLinkMutation = useMutation({
        mutationFn: ({ linkId }: { linkId: number; parentId: number }) =>
            deleteParentalLink(linkId),
        onSuccess: async (res, variables) => {
            await qc.invalidateQueries({ queryKey: deptTypeChildrenQK(variables.parentId) });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onDeleteSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    return {
        createLinkMutation,
        updateLinkMutation,
        toggleLinkActiveMutation,
        deleteLinkMutation,
    };
}
