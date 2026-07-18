// src/components/admin/employee_event_types/EmployeeEventTypeCrud.tsx
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
import { fetchEmployeeEventTypes, type EmployeeEventType } from './employeeEventTypeApi.ts';
import { useEmployeeEventTypeMutations } from './useEmployeeEventTypeMutations.ts';
import { useEmployeeEventTypeColumns, type EditingState } from './useEmployeeEventTypeColumns.tsx';
import { EmployeeEventTypeForm } from './EmployeeEventTypeForm.tsx';
import { FieldEditConfirmDialog, type PendingEdit } from '../../../ui/FieldEditConfirmDialog';
import { useDataGridLocale } from '../../../../hooks/useDataGridLocale.ts';
import useString from '../../../../hooks/useString.ts';
import str from '../../../../strings/str.ts';
import cfl from '../../../../utils/helpers.ts';
import {EMPLOYEE_EVENT_TYPE_QK} from "../../../../utils/queryKeys.ts";
import ConfirmDeleteDialog from '../../../ui/ConfirmDeleteDialog';

export function EmployeeEventTypeCrud() {
    const getString = useString({ str });

    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error',
    });

    const [formOpen, setFormOpen] = useState(false);
    const [editingState, setEditingState] = useState<EditingState>({ userId: null, field: null });
    const [pendingEdit, setPendingEdit] = useState<PendingEdit | null>(null);
    const [rowToDelete, setRowToDelete] = useState<EmployeeEventType | null>(null);
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });

    const { data: rows = [], isLoading, error } = useQuery({
        queryKey: EMPLOYEE_EVENT_TYPE_QK,
        queryFn: fetchEmployeeEventTypes,
        staleTime: 2 * 60 * 1000,
    });

    const { createMutation, updateMutation, deleteMutation } = useEmployeeEventTypeMutations({
        setSnackbar,
        onCreateSuccess: () => setFormOpen(false),
        onUpdateSuccess: () => {
            setEditingState({ userId: null, field: null });
            setPendingEdit(null);
        },
        onDeleteSuccess: () => setRowToDelete(null),
        onDeleteError: () => setRowToDelete(null),
    });

    const localeText = useDataGridLocale();

    const handleEditFieldClick = useCallback(
        (row: EmployeeEventType, field: string, e: React.MouseEvent) => {
            e.stopPropagation();
            setEditingState({ userId: row.id, field });
        },
        [],
    );

    const handleRequestSave = useCallback(
        (row: EmployeeEventType, field: string, newValue: string) => {
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
        setEditingState({ userId: null, field: null });
    }, []);

    const handleCancelPending = useCallback(() => {
        setPendingEdit(null);
        setEditingState({ userId: null, field: null });
    }, []);

    const handleDeleteClick = useCallback((row: EmployeeEventType) => {
        setRowToDelete(row);
    }, []);

    const handleConfirmDelete = useCallback(() => {
        if (!rowToDelete) return;
        deleteMutation.mutate(rowToDelete.id);
    }, [rowToDelete, deleteMutation]);

    const columns = useEmployeeEventTypeColumns({
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
                    {getString('employeeEventTypes') || 'Employee Event Types'}
                </Typography>
                <Button
                    variant="contained"
                    size="medium"
                    startIcon={<AddIcon />}
                    onClick={() => setFormOpen(true)}
                >
                    {cfl(getString('addEmployeeEventType')) || 'Add'}
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

            <EmployeeEventTypeForm
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

            <ConfirmDeleteDialog
                open={!!rowToDelete}
                title={getString('deleteEmployeeEventType') || 'Delete Employee Event Type'}
                message={getString('areYouSureDeleteEmployeeEventType') || `Are you sure you want to delete "${rowToDelete?.name}"? This action cannot be undone.`}
                isDeleting={deleteMutation.isPending}
                onConfirm={handleConfirmDelete}
                onClose={() => setRowToDelete(null)}
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