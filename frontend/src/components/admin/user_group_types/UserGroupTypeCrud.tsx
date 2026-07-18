// src/components/admin/user_group_types/UserGroupTypeCrud.tsx
import React, { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Paper,
    Snackbar,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DataGrid } from '@mui/x-data-grid';
import { fetchUserGroupTypes, type UserGroupType } from './userGroupTypeApi';
import { useUserGroupTypeMutations } from './useUserGroupTypeMutations';
import { useUserGroupTypeColumns, type EditingState } from './useUserGroupTypeColumns';
import { UserGroupTypeForm } from './UserGroupTypeForm';
import { FieldEditConfirmDialog, type PendingEdit } from '../../ui/FieldEditConfirmDialog';
import { UserGroupTypeDeleteDialog } from './UserGroupTypeDeleteDialog';
import { useDataGridLocale } from '../../../hooks/useDataGridLocale';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';
import cfl from '../../../utils/helpers.ts';
import {USER_GROUP_TYPE_QK} from "../../../utils/queryKeys.ts";

export function UserGroupTypeCrud() {
    const getString = useString({ str });

    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error',
    });

    const [formOpen, setFormOpen] = useState(false);
    const [editingState, setEditingState] = useState<EditingState>({ id: null, field: null });
    const [pendingEdit, setPendingEdit] = useState<PendingEdit | null>(null);
    const [rowToDelete, setRowToDelete] = useState<UserGroupType | null>(null);
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });

    const { data: rows = [], isLoading, error } = useQuery({
        queryKey: USER_GROUP_TYPE_QK,
        queryFn: fetchUserGroupTypes,
        staleTime: 2 * 60 * 1000,
    });

    const { createMutation, updateMutation, deleteMutation } = useUserGroupTypeMutations({
        setSnackbar,
        onCreateSuccess: () => setFormOpen(false),
        onUpdateSuccess: () => {
            setEditingState({ id: null, field: null });
            setPendingEdit(null);
        },
        onDeleteSuccess: () => setRowToDelete(null),
        onDeleteError: () => setRowToDelete(null),
    });

    const localeText = useDataGridLocale();

    const handleEditFieldClick = useCallback(
        (row: UserGroupType, field: string, e: React.MouseEvent) => {
            e.stopPropagation();
            setEditingState({ id: row.id, field });
        },
        [],
    );

    const handleRequestSave = useCallback(
        (row: UserGroupType, field: string, newValue: string) => {
            const fieldLabelMap: Record<string, string> = {
                name: getString('name') || 'Name',
                description: getString('description') || 'Description',
            };
            setPendingEdit({
                id: row.id,
                fieldLabel: fieldLabelMap[field] ?? field,
                field,
                newValue,
                oldValue: String((row as unknown as Record<string, unknown>)[field] ?? ''),
            });
        },
        [getString],
    );

    const handleConfirmEdit = useCallback(() => {
        if (!pendingEdit) return;
        updateMutation.mutate({
            id: pendingEdit.id,
            data: { [pendingEdit.field]: pendingEdit.newValue },
        });
    }, [pendingEdit, updateMutation]);

    const handleCancelEdit = useCallback(() => {
        setEditingState({ id: null, field: null });
    }, []);

    const handleCancelPending = useCallback(() => {
        setPendingEdit(null);
        setEditingState({ id: null, field: null });
    }, []);

    const handleDeleteClick = useCallback((row: UserGroupType) => {
        setRowToDelete(row);
    }, []);

    const handleConfirmDelete = useCallback(() => {
        if (!rowToDelete) return;
        deleteMutation.mutate(rowToDelete.id);
    }, [rowToDelete, deleteMutation]);

    const columns = useUserGroupTypeColumns({
        getString,
        editingState,
        onEditFieldClick: handleEditFieldClick,
        onRequestSave: handleRequestSave,
        onCancelEdit: handleCancelEdit,
        updateIsPending: updateMutation.isPending,
        onDeleteClick: handleDeleteClick,
        deleteIsPending: deleteMutation.isPending,
    });

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Typography variant="h6" fontWeight={600} sx={{ flex: 1 }}>
                    {getString('userGroupTypes') || 'User Group Types'}
                </Typography>
                <Button
                    variant="contained"
                    size="medium"
                    startIcon={<AddIcon />}
                    onClick={() => setFormOpen(true)}
                >
                    {cfl(getString('addUserGroupType')) || 'Add Type'}
                </Button>
            </Box>

            {isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                </Box>
            )}

            {!isLoading && error && (
                <Alert severity="error" sx={{ m: 2 }}>
                    {(error as Error).message}
                </Alert>
            )}

            {!isLoading && !error && (
                <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                    <DataGrid
                        rows={rows}
                        columns={columns}
                        paginationModel={paginationModel}
                        onPaginationModelChange={setPaginationModel}
                        pageSizeOptions={[5, 10, 25, 50]}
                        disableRowSelectionOnClick
                        getRowId={(row) => row.id}
                        getRowHeight={() => 'auto'}
                        localeText={localeText}
                        hideFooterSelectedRowCount
                        sx={{ '& .MuiDataGrid-cell': { alignItems: 'center', py: 1 } }}
                    />
                </Paper>
            )}

            <UserGroupTypeForm
                open={formOpen}
                onClose={() => setFormOpen(false)}
                createMutation={createMutation}
            />

            <FieldEditConfirmDialog
                pending={pendingEdit}
                isPending={updateMutation.isPending}
                onConfirm={handleConfirmEdit}
                onCancel={handleCancelPending}
            />

            <UserGroupTypeDeleteDialog
                row={rowToDelete}
                isPending={deleteMutation.isPending}
                hasGroups={!!(rowToDelete?.groups && rowToDelete.groups.length > 0)}
                onConfirm={handleConfirmDelete}
                onCancel={() => setRowToDelete(null)}
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