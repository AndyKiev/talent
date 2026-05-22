// src/components/admin/department_types/useDepartmentTypeLinkMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {createParentalLink, deleteParentalLink} from "./departmentTypeParentalLinkApi.ts";


type Snackbar = { open: boolean; message: string; severity: 'success' | 'error' };

/** Query key factory — children for a given parent type */
export const deptTypeChildrenQK = (parentId: number) =>
    ['department_type_children', parentId] as const;

interface Props {
    setSnackbar: (s: Snackbar) => void;
    onCreateSuccess?: () => void;
    onDeleteSuccess?: () => void;
}

export function useDepartmentTypeLinkMutations({ setSnackbar, onCreateSuccess, onDeleteSuccess }: Props) {
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

    return { createLinkMutation, deleteLinkMutation };
}
