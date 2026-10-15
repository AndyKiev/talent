// src/components/admin/department_types/useDepartmentTypeLinkMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    createParentalLink,
    updateParentalLink,
    deleteParentalLink,
} from './departmentTypeParentalLinkApi.ts';
import {
    DEPARTMENT_TYPE_CHILD_MAP_QK,
    DEPARTMENT_TYPE_PARENTAL_LINKS_QK,
} from '../../../utils/queryKeys.ts';

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

    // Whole-graph views (organigram, department tree child map) read every
    // link at once — refresh them on any link change.
    const invalidateGraph = () =>
        Promise.all([
            qc.invalidateQueries({ queryKey: DEPARTMENT_TYPE_PARENTAL_LINKS_QK }),
            qc.invalidateQueries({ queryKey: DEPARTMENT_TYPE_CHILD_MAP_QK }),
        ]);

    const createLinkMutation = useMutation({
        mutationFn: createParentalLink,
        onSuccess: async (res, variables) => {
            // Invalidate the children list for the parent that just got a new child
            await Promise.all([
                qc.invalidateQueries({ queryKey: deptTypeChildrenQK(variables.parent_id) }),
                invalidateGraph(),
            ]);
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
                invalidateGraph(),
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
            await Promise.all([
                qc.invalidateQueries({ queryKey: deptTypeChildrenQK(variables.parentId) }),
                invalidateGraph(),
            ]);
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
            await Promise.all([
                qc.invalidateQueries({ queryKey: deptTypeChildrenQK(variables.parentId) }),
                invalidateGraph(),
            ]);
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
