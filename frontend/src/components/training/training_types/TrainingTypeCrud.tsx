// src/components/training/training_types/TrainingTypeCrud.tsx
import { useCallback, useState } from 'react';
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
import { fetchTrainingTypes, type TrainingType } from './trainingTypeApi';
import { useTrainingTypeMutations } from './useTrainingTypeMutations';
import { useTrainingTypeColumns } from './useTrainingTypeColumns';
import { TrainingTypeForm } from './TrainingTypeForm';
import { useDataGridLocale } from '../../../hooks/useDataGridLocale';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';
import cfl from '../../../utils/helpers.ts';
import { TRAINING_TYPE_QK } from '../../../utils/queryKeys.ts';
import ConfirmDeleteDialog from '../../ui/ConfirmDeleteDialog';

export function TrainingTypeCrud() {
    const getString = useString({ str });

    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error',
    });

    const [formOpen, setFormOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<TrainingType | null>(null);
    const [rowToDelete, setRowToDelete] = useState<TrainingType | null>(null);
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });

    const { data: rows = [], isLoading, error } = useQuery({
        queryKey: TRAINING_TYPE_QK,
        queryFn: () => fetchTrainingTypes(),
        staleTime: 2 * 60 * 1000,
    });

    const { createMutation, updateMutation, deleteMutation } = useTrainingTypeMutations({
        setSnackbar,
        onCreateSuccess: () => setFormOpen(false),
        onUpdateSuccess: () => {
            setFormOpen(false);
            setEditingRecord(null);
        },
        onDeleteSuccess: () => setRowToDelete(null),
        onDeleteError: () => setRowToDelete(null),
    });

    const localeText = useDataGridLocale();

    const handleAddClick = useCallback(() => {
        setEditingRecord(null);
        setFormOpen(true);
    }, []);

    const handleEditClick = useCallback((row: TrainingType) => {
        setEditingRecord(row);
        setFormOpen(true);
    }, []);

    const handleDeleteClick = useCallback((row: TrainingType) => {
        setRowToDelete(row);
    }, []);

    const handleConfirmDelete = useCallback(() => {
        if (!rowToDelete) return;
        deleteMutation.mutate(rowToDelete.id);
    }, [rowToDelete, deleteMutation]);

    const handleFormClose = useCallback(() => {
        setFormOpen(false);
        setEditingRecord(null);
    }, []);

    const columns = useTrainingTypeColumns({
        getString,
        onEditClick: handleEditClick,
        onDeleteClick: handleDeleteClick,
        deleteIsPending: deleteMutation.isPending,
    });

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Typography variant="h6" fontWeight={600} sx={{ flex: 1 }}>
                    {getString('trainingTypes') || 'Training Types'}
                </Typography>
                <Button
                    variant="contained"
                    size="medium"
                    startIcon={<AddIcon />}
                    onClick={handleAddClick}
                >
                    {cfl(getString('addTrainingType')) || 'Add'}
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

            <TrainingTypeForm
                open={formOpen}
                onClose={handleFormClose}
                editingRecord={editingRecord}
                createMutation={createMutation}
                updateMutation={updateMutation}
            />

            <ConfirmDeleteDialog
                open={!!rowToDelete}
                title={getString('deleteTrainingType') || 'Delete Training Type'}
                message={getString('areYouSureDeleteTrainingType') || `Are you sure you want to delete "${rowToDelete?.name}"? This action cannot be undone.`}
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
