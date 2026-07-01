// src/components/admin/job_categories/JobCategoryCrud.tsx
import React, { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Paper,
    Snackbar,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import LayersClearIcon from '@mui/icons-material/LayersClear';
import { DataGrid } from '@mui/x-data-grid';
import { fetchJobCategories, updateJobCategory, type JobCategory } from './jobCategoryApi';
import { useJobCategoryMutations } from './useJobCategoryMutations';
import { useJobCategoryColumns, type EditingState } from './useJobCategoryColumns';
import { useArrowReorder } from '../review_dimensions/useArrowReorder';
import { JobCategoryForm } from './JobCategoryForm';
import { JobCategoryEditDialog, type PendingEdit } from './JobCategoryEditDialog';
import { JobCategoryDeleteDialog } from './JobCategoryDeleteDialog';
import { useDataGridLocale } from '../../../hooks/useDataGridLocale';
import useString from '../../../hooks/useString';
import cfl from '../../../utils/helpers.ts';
import { JOB_CATEGORY_QK } from '../../../utils/queryKeys.ts';

export function JobCategoryCrud() {
    const getString = useString();

    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error',
    });

    const [formOpen, setFormOpen] = useState(false);
    const [editingState, setEditingState] = useState<EditingState>({ rowId: null, field: null });
    const [pendingEdit, setPendingEdit] = useState<PendingEdit | null>(null);
    const [rowToDelete, setRowToDelete] = useState<JobCategory | null>(null);
    const [clearAllOpen, setClearAllOpen] = useState(false);
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });

    const { data: rows = [], isLoading, error } = useQuery({
        queryKey: JOB_CATEGORY_QK,
        queryFn: () => fetchJobCategories(),
        staleTime: 2 * 60 * 1000,
    });

    const sortedRows = useMemo(
        () => [...rows].sort((a, b) => (a.sort_order - b.sort_order) || (a.id - b.id)),
        [rows],
    );

    const { createMutation, updateMutation, deleteMutation, clearAllMutation } =
        useJobCategoryMutations({
            setSnackbar,
            onCreateSuccess: () => setFormOpen(false),
            onUpdateSuccess: () => {
                setEditingState({ rowId: null, field: null });
                setPendingEdit(null);
            },
            onDeleteSuccess: () => setRowToDelete(null),
            onDeleteError: () => setRowToDelete(null),
            onClearAllSuccess: () => setClearAllOpen(false),
        });

    const localeText = useDataGridLocale();

    const { orderColumn } = useArrowReorder<JobCategory>({
        rows: sortedRows,
        updateSortOrder: (id, sort_order) => updateJobCategory({ id, data: { sort_order } }),
        invalidateKeys: [JOB_CATEGORY_QK],
        getString,
        onError: (message) => setSnackbar({ open: true, message, severity: 'error' }),
    });

    const handleEditFieldClick = useCallback(
        (row: JobCategory, field: string, e: React.MouseEvent) => {
            e.stopPropagation();
            setEditingState({ rowId: row.id, field });
        },
        [],
    );

    const handleRequestSave = useCallback(
        (row: JobCategory, field: string, newValue: string) => {
            const fieldLabelMap: Record<string, string> = {
                key: getString('key') || 'Key',
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

    const handleDeleteClick = useCallback((row: JobCategory) => {
        setRowToDelete(row);
    }, []);

    const handleConfirmDelete = useCallback(() => {
        if (!rowToDelete) return;
        deleteMutation.mutate(rowToDelete.id);
    }, [rowToDelete, deleteMutation]);

    const columns = useJobCategoryColumns({
        getString,
        editingState,
        onEditFieldClick: handleEditFieldClick,
        onRequestSave: handleRequestSave,
        onCancelEdit: handleCancelEdit,
        updateIsPending: updateMutation.isPending,
        onDeleteClick: handleDeleteClick,
        deleteIsPending: deleteMutation.isPending,
        orderColumn,
    });

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Typography variant="h6" fontWeight={600} sx={{ flex: 1 }}>
                    {getString('jobCategories') || 'Job Categories'}
                </Typography>
                <Button
                    variant="outlined"
                    color="error"
                    size="medium"
                    startIcon={<LayersClearIcon />}
                    onClick={() => setClearAllOpen(true)}
                >
                    {cfl(getString('removeAllJobCategories')) || 'Remove all from jobs'}
                </Button>
                <Button
                    variant="contained"
                    size="medium"
                    startIcon={<AddIcon />}
                    onClick={() => setFormOpen(true)}
                >
                    {cfl(getString('addJobCategory')) || 'Add'}
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
                        rows={sortedRows}
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

            <JobCategoryForm
                open={formOpen}
                onClose={() => setFormOpen(false)}
                createMutation={createMutation}
                nextSortOrder={sortedRows.length}
            />

            <JobCategoryEditDialog
                pending={pendingEdit}
                isPending={updateMutation.isPending}
                onConfirm={handleConfirmEdit}
                onCancel={handleCancelPending}
            />

            <JobCategoryDeleteDialog
                row={rowToDelete}
                isPending={deleteMutation.isPending}
                onConfirm={handleConfirmDelete}
                onCancel={() => setRowToDelete(null)}
            />

            {/* Deliberate, confirm-gated bulk removal of every job ↔ category link. */}
            <Dialog open={clearAllOpen} onClose={() => setClearAllOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>{getString('removeAllJobCategories') || 'Remove all from jobs'}</DialogTitle>
                <DialogContent>
                    <Typography variant="body2">
                        {getString('areYouSureRemoveAllJobCategories') ||
                            'This removes the category from EVERY job. The categories themselves stay. This cannot be undone.'}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button
                        variant="outlined"
                        onClick={() => setClearAllOpen(false)}
                        disabled={clearAllMutation.isPending}
                    >
                        {getString('cancel') || 'Cancel'}
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={() => clearAllMutation.mutate()}
                        disabled={clearAllMutation.isPending}
                        startIcon={
                            clearAllMutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined
                        }
                    >
                        {getString('removeAll') || 'Remove all'}
                    </Button>
                </DialogActions>
            </Dialog>

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
