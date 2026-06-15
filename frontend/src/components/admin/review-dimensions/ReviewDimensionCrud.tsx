import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    IconButton,
    Paper,
    Snackbar,
    Stack,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { fetchReviewDimensions, type ReviewDimension } from './reviewDimensionApi';
import { REVIEW_DIMENSION_QK, useReviewDimensionMutations } from './useReviewDimensionMutations';
import { ReviewDimensionForm } from './ReviewDimensionForm';
import { useDataGridLocale } from '../../../hooks/useDataGridLocale';

export function ReviewDimensionCrud() {
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error',
    });
    const [formOpen, setFormOpen] = useState(false);
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });

    const { data: rows = [], isLoading, error } = useQuery({
        queryKey: REVIEW_DIMENSION_QK,
        queryFn: fetchReviewDimensions,
        staleTime: 2 * 60 * 1000,
    });

    const { createMutation, updateMutation, deleteMutation } = useReviewDimensionMutations({
        setSnackbar,
        onCreateSuccess: () => setFormOpen(false),
    });

    const localeText = useDataGridLocale();

    const handleToggleActive = useCallback(
        (row: ReviewDimension) => {
            updateMutation.mutate({ id: row.id, data: { is_active: !row.is_active } });
        },
        [updateMutation],
    );

    const handleDelete = useCallback(
        (id: number) => {
            deleteMutation.mutate(id);
        },
        [deleteMutation],
    );

    const columns: GridColDef<ReviewDimension>[] = [
        { field: 'id', headerName: 'ID', width: 60 },
        { field: 'name', headerName: 'Name', flex: 1, minWidth: 200 },
        { field: 'key', headerName: 'Key', width: 200 },
        {
            field: 'description',
            headerName: 'Description',
            flex: 1,
            minWidth: 200,
        },
        {
            field: 'criteria',
            headerName: 'Criteria',
            width: 80,
            renderCell: (params) => (
                <Chip
                    label={params.row.criteria?.length ?? 0}
                    size="small"
                    variant="outlined"
                />
            ),
        },
        {
            field: 'is_active',
            headerName: 'Active',
            width: 90,
            renderCell: (params) => (
                <Chip
                    label={params.row.is_active ? 'Yes' : 'No'}
                    color={params.row.is_active ? 'success' : 'default'}
                    size="small"
                    onClick={() => handleToggleActive(params.row)}
                    sx={{ cursor: 'pointer' }}
                />
            ),
        },
        {
            field: 'actions',
            headerName: '',
            width: 80,
            sortable: false,
            renderCell: (params) => (
                <Stack direction="row" spacing={0.5}>
                    <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(params.row.id)}
                        disabled={deleteMutation.isPending}
                    >
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </Stack>
            ),
        },
    ];

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Typography variant="h6" fontWeight={600} sx={{ flex: 1 }}>
                    Review Dimensions
                </Typography>
                <Button
                    variant="contained"
                    size="medium"
                    startIcon={<AddIcon />}
                    onClick={() => setFormOpen(true)}
                >
                    Add Dimension
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
                        pageSizeOptions={[5, 10, 25]}
                        disableRowSelectionOnClick
                        getRowId={(row) => row.id}
                        getRowHeight={() => 'auto'}
                        localeText={localeText}
                        hideFooterSelectedRowCount
                        sx={{ '& .MuiDataGrid-cell': { alignItems: 'center', py: 1 } }}
                    />
                </Paper>
            )}

            <ReviewDimensionForm
                open={formOpen}
                onClose={() => setFormOpen(false)}
                createMutation={createMutation}
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
