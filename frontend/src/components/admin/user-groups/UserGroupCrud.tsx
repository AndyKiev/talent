// src/components/admin/user-groups/UserGroupCrud.tsx
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

import { fetchUserGroups, type UserGroup } from './userGroupApi';
import { USER_GROUP_QK, useUserGroupMutations } from './useUserGroupMutations';
import { useUserGroupColumns, type EditingState } from './useUserGroupColumns';

import { UserGroupEditDialog, type PendingEdit } from './UserGroupEditDialog';
import { UserGroupDeleteDialog } from './UserGroupDeleteDialog';
import { UserGroupTypeSelectDialog } from './UserGroupTypeSelectDialog';
import { fetchUserGroupTypes } from '../user-group-types/userGroupTypeApi';
import { USER_GROUP_TYPE_QK } from '../user-group-types/useUserGroupTypeMutations';
import { useDataGridLocale } from '../../../hooks/useDataGridLocale';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';
import cfl from '../../../utils/capitalizeFirstLetter';
import {UserGroupForm} from "./UserGroupForm.tsx";

export function UserGroupCrud() {
    const getString = useString({ str });

    // ── Snackbar ──────────────────────────────────────────────────────────────
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error',
    });

    // ── Dialog states ─────────────────────────────────────────────────────────
    const [formOpen, setFormOpen] = useState(false);
    const [editingState, setEditingState] = useState<EditingState>({ rowId: null, field: null });
    const [pendingEdit, setPendingEdit] = useState<PendingEdit | null>(null);
    const [rowToDelete, setRowToDelete] = useState<UserGroup | null>(null);
    const [typeSelectGroup, setTypeSelectGroup] = useState<UserGroup | null>(null);

    // ── Pagination ────────────────────────────────────────────────────────────
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });

    // ── Queries ───────────────────────────────────────────────────────────────
    const { data: rows = [], isLoading, error } = useQuery({
        queryKey: USER_GROUP_QK,
        queryFn: fetchUserGroups,
        staleTime: 2 * 60 * 1000,
    });

    // Prefetch types so the Type column can resolve names without extra loading states
    const { data: groupTypes = [] } = useQuery({
        queryKey: USER_GROUP_TYPE_QK,
        queryFn: fetchUserGroupTypes,
        staleTime: 5 * 60 * 1000,
    });

    // ── Mutations ─────────────────────────────────────────────────────────────
    const { createMutation, updateMutation, deleteMutation } = useUserGroupMutations({
        setSnackbar,
        deleteSuccessMessage: getString('userGroupDeleteSuccess') || 'Group deleted successfully',
        onCreateSuccess: () => setFormOpen(false),
        onUpdateSuccess: () => {
            setEditingState({ rowId: null, field: null });
            setPendingEdit(null);
            setTypeSelectGroup(null);
        },
        onDeleteSuccess: () => setRowToDelete(null),
        onDeleteError: () => setRowToDelete(null),
    });

    const localeText = useDataGridLocale();

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleEditFieldClick = useCallback(
        (row: UserGroup, field: string, e: React.MouseEvent) => {
            e.stopPropagation();
            setEditingState({ rowId: row.id, field });
        },
        [],
    );

    const handleRequestSave = useCallback(
        (row: UserGroup, field: string, newValue: string) => {
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
        setEditingState({ rowId: null, field: null });
    }, []);

    const handleCancelPending = useCallback(() => {
        setPendingEdit(null);
        setEditingState({ rowId: null, field: null });
    }, []);

    // is_protected toggle goes through the edit confirmation dialog
    const handleToggleProtected = useCallback(
        (row: UserGroup) => {
            setPendingEdit({
                id: row.id,
                fieldLabel: getString('isProtected') || 'Protected',
                field: 'is_protected',
                newValue: !row.is_protected,
                oldValue: row.is_protected,
            });
        },
        [getString],
    );

    // Type chip click → open type selector dialog
    const handleEditTypeClick = useCallback((row: UserGroup) => {
        setTypeSelectGroup(row);
    }, []);

    // Called by UserGroupTypeSelectDialog on confirm
    const handleConfirmTypeChange = useCallback(
        (groupId: number, newTypeId: number) => {
            updateMutation.mutate({ id: groupId, data: { user_group_type_id: newTypeId } });
        },
        [updateMutation],
    );

    const handleDeleteClick = useCallback((row: UserGroup) => {
        setRowToDelete(row);
    }, []);

    const handleConfirmDelete = useCallback(() => {
        if (!rowToDelete) return;
        deleteMutation.mutate(rowToDelete.id);
    }, [rowToDelete, deleteMutation]);

    // ── Columns ───────────────────────────────────────────────────────────────
    const columns = useUserGroupColumns({
        getString,
        groupTypes,
        editingState,
        onEditFieldClick: handleEditFieldClick,
        onRequestSave: handleRequestSave,
        onCancelEdit: handleCancelEdit,
        updateIsPending: updateMutation.isPending,
        onToggleProtected: handleToggleProtected,
        toggleIsPending: updateMutation.isPending,
        onEditTypeClick: handleEditTypeClick,
        onDeleteClick: handleDeleteClick,
        deleteIsPending: deleteMutation.isPending,
    });

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Typography variant="h6" fontWeight={600} sx={{ flex: 1 }}>
                    {getString('userGroups') || 'User Groups'}
                </Typography>
                <Button
                    variant="contained"
                    size="medium"
                    startIcon={<AddIcon />}
                    onClick={() => setFormOpen(true)}
                >
                    {cfl(getString('addUserGroup')) || 'Add Group'}
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

            <UserGroupForm
                open={formOpen}
                onClose={() => setFormOpen(false)}
                createMutation={createMutation}
            />

            <UserGroupEditDialog
                pending={pendingEdit}
                isPending={updateMutation.isPending}
                onConfirm={handleConfirmEdit}
                onCancel={handleCancelPending}
            />

            <UserGroupDeleteDialog
                row={rowToDelete}
                isPending={deleteMutation.isPending}
                onConfirm={handleConfirmDelete}
                onCancel={() => setRowToDelete(null)}
            />

            <UserGroupTypeSelectDialog
                group={typeSelectGroup}
                isPending={updateMutation.isPending}
                onConfirm={handleConfirmTypeChange}
                onCancel={() => setTypeSelectGroup(null)}
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