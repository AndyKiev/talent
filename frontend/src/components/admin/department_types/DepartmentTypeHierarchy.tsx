// src/components/admin/department_types/DepartmentTypeHierarchy.tsx
import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Alert,
    Box,
    CircularProgress,
    Paper,
    Snackbar,
    Typography,
} from '@mui/material';

import { fetchDepartmentTypes, type DepartmentType } from './departmentTypeApi';
import { DEPARTMENT_TYPE_QK, useDepartmentTypeMutations } from './useDepartmentTypeMutations';
import { useDepartmentTypeLinkMutations } from './useDepartmentTypeLinkMutations';
import { DepartmentTypeHierarchyRow } from './DepartmentTypeHierarchyRow';
import { DepartmentTypeEditDialog, type PendingEdit } from './DepartmentTypeEditDialog';
import { DepartmentTypeDeleteDialog } from './DepartmentTypeDeleteDialog';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';

export function DepartmentTypeHierarchy() {
    const getString = useString({ str });

    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error',
    });

    const [pendingEdit, setPendingEdit] = useState<PendingEdit | null>(null);
    const [typeToDelete, setTypeToDelete] = useState<DepartmentType | null>(null);

    // ── All types (flat list, used as the source for link selects) ──────────
    const { data: allTypes = [], isLoading, error } = useQuery({
        queryKey: DEPARTMENT_TYPE_QK,
        queryFn: fetchDepartmentTypes,
        staleTime: 2 * 60 * 1000,
    });

    // ── Type mutations (update / delete the type itself) ────────────────────
    const { updateMutation, deleteMutation } = useDepartmentTypeMutations({
        setSnackbar,
        onUpdateSuccess: () => setPendingEdit(null),
        onDeleteSuccess: () => setTypeToDelete(null),
        onDeleteError: () => setTypeToDelete(null),
    });

    // ── Link mutations (create / delete parental links) ─────────────────────
    const { createLinkMutation, deleteLinkMutation } = useDepartmentTypeLinkMutations({
        setSnackbar,
    });

    // ── Handlers ────────────────────────────────────────────────────────────

    const handleToggleActive = useCallback(
        (type: DepartmentType) => {
            setPendingEdit({
                id: type.id,
                fieldLabel: getString('isActive') || 'Active',
                field: 'is_active',
                newValue: !type.is_active,
                oldValue: type.is_active,
            });
        },
        [getString],
    );

    const handleConfirmEdit = useCallback(() => {
        if (!pendingEdit) return;
        updateMutation.mutate({ id: pendingEdit.id, data: { [pendingEdit.field]: pendingEdit.newValue } });
    }, [pendingEdit, updateMutation]);

    const handleDeleteLink = useCallback(
        (linkId: number, parentId: number) => {
            deleteLinkMutation.mutate({ linkId, parentId });
        },
        [deleteLinkMutation],
    );

    const handleConfirmDelete = useCallback(() => {
        if (!typeToDelete) return;
        deleteMutation.mutate(typeToDelete.id);
    }, [typeToDelete, deleteMutation]);

    // ── Render ───────────────────────────────────────────────────────────────

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Alert severity="error" sx={{ m: 2 }}>
                {(error as Error).message}
            </Alert>
        );
    }

    return (
        <Box>
            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                {allTypes.length === 0 ? (
                    <Box sx={{ p: 4, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                            {getString('noDepartmentTypes') || 'No department types yet.'}
                        </Typography>
                    </Box>
                ) : (
                    <Box sx={{ py: 1 }}>
                        {allTypes.map((type) => (
                            <DepartmentTypeHierarchyRow
                                key={type.id}
                                type={type}
                                allTypes={allTypes}
                                depth={0}
                                updateIsPending={updateMutation.isPending}
                                deleteIsPending={deleteMutation.isPending}
                                deleteLinkIsPending={deleteLinkMutation.isPending}
                                createLinkMutation={createLinkMutation}
                                onToggleActive={handleToggleActive}
                                onDeleteClick={setTypeToDelete}
                                onRequestEdit={setPendingEdit}
                                onDeleteLink={handleDeleteLink}
                                setSnackbar={setSnackbar}
                            />
                        ))}
                    </Box>
                )}
            </Paper>

            {/* Confirmation dialogs */}
            <DepartmentTypeEditDialog
                pending={pendingEdit}
                isPending={updateMutation.isPending}
                onConfirm={handleConfirmEdit}
                onCancel={() => setPendingEdit(null)}
            />

            <DepartmentTypeDeleteDialog
                row={typeToDelete}
                isPending={deleteMutation.isPending}
                onConfirm={handleConfirmDelete}
                onCancel={() => setTypeToDelete(null)}
            />

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    severity={snackbar.severity}
                    onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
