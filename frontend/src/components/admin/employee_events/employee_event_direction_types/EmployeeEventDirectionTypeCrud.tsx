// src/components/admin/employee_events/employee_event_direction_types/EmployeeEventDirectionTypeCrud.tsx
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
import {
    fetchEmployeeEventDirectionTypes,
    type EmployeeEventDirectionType,
} from './employeeEventDirectionTypeApi';
import {
    EMPLOYEE_EVENT_DIRECTION_TYPE_QK,
    useEmployeeEventDirectionTypeMutations,
} from './useEmployeeEventDirectionTypeMutations';
import {
    useEmployeeEventDirectionTypeColumns,
    type EditingState,
} from './useEmployeeEventDirectionTypeColumns';
import { EmployeeEventDirectionTypeForm } from './EmployeeEventDirectionTypeForm';
import {
    EmployeeEventDirectionTypeEditDialog,
    type PendingEdit,
} from './EmployeeEventDirectionTypeEditDialog';
import { EmployeeEventDirectionTypeDeleteDialog } from './EmployeeEventDirectionTypeDeleteDialog';
import { useDataGridLocale } from '../../../../hooks/useDataGridLocale';
import useString from '../../../../hooks/useString';
import str from '../../../../strings/str';
import cfl from '../../../../utils/capitalizeFirstLetter';

export function EmployeeEventDirectionTypeCrud() {
    const getString = useString({ str });

    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error',
    });

    const [formOpen, setFormOpen] = useState(false);
    const [editingState, setEditingState] = useState<EditingState>({ rowId: null, field: null });
    const [pendingEdit, setPendingEdit] = useState<PendingEdit | null>(null);
    const [rowToDelete, setRowToDelete] = useState<EmployeeEventDirectionType | null>(null);
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });

    const { data: rows = [], isLoading, error } = useQuery({
        queryKey: EMPLOYEE_EVENT_DIRECTION_TYPE_QK,
        queryFn: fetchEmployeeEventDirectionTypes,
        staleTime: 2 * 60 * 1000,
    });

    const { createMutation, updateMutation, deleteMutation } =
        useEmployeeEventDirectionTypeMutations({
            setSnackbar,
            onCreateSuccess: () => setFormOpen(false),
            onUpdateSuccess: () => {
                setEditingState({ rowId: null, field: null });
                setPendingEdit(null);
            },
            onDeleteSuccess: () => setRowToDelete(null),
            onDeleteError: () => setRowToDelete(null),
        });

    const localeText = useDataGridLocale();

    const handleEditFieldClick = useCallback(
        (row: EmployeeEventDirectionType, field: string, e: React.MouseEvent) => {
            e.stopPropagation();
            setEditingState({ rowId: row.id, field });
        },
        [],
    );

    const handleRequestSave = useCallback(
        (row: EmployeeEventDirectionType, field: string, newValue: string) => {
            const fieldLabelMap: Record<string, string> = {
                name: getString('name') || 'Name',
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

    const handleDeleteClick = useCallback((row: EmployeeEventDirectionType) => {
        setRowToDelete(row);
    }, []);

    const handleConfirmDelete = useCallback(() => {
        if (!rowToDelete) return;
        deleteMutation.mutate(rowToDelete.id);
    }, [rowToDelete, deleteMutation]);

    const columns = useEmployeeEventDirectionTypeColumns({
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
                    {getString('employeeEventDirectionTypes') || 'Employee Event Direction Types'}
                </Typography>
                <Button
                    variant="contained"
                    size="medium"
                    startIcon={<AddIcon />}
                    onClick={() => setFormOpen(true)}
                >
                    {cfl(getString('addEmployeeEventDirectionType')) || 'Add'}
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

            <EmployeeEventDirectionTypeForm
                open={formOpen}
                onClose={() => setFormOpen(false)}
                createMutation={createMutation}
            />

            <EmployeeEventDirectionTypeEditDialog
                pending={pendingEdit}
                isPending={updateMutation.isPending}
                onConfirm={handleConfirmEdit}
                onCancel={handleCancelPending}
            />

            <EmployeeEventDirectionTypeDeleteDialog
                row={rowToDelete}
                isPending={deleteMutation.isPending}
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
