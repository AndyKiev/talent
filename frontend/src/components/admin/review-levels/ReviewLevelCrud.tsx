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
import useString from '../../../hooks/useString';
import { fetchReviewLevels, type ReviewLevel } from './reviewLevelApi';
import { REVIEW_LEVEL_QK, useReviewLevelMutations } from './useReviewLevelMutations';
import { ReviewLevelForm } from './ReviewLevelForm';
import { useDataGridLocale } from '../../../hooks/useDataGridLocale';

export function ReviewLevelCrud() {
    const getString = useString();
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error',
    });
    const [formOpen, setFormOpen] = useState(false);
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });

    const { data: rows = [], isLoading, error } = useQuery({
        queryKey: REVIEW_LEVEL_QK,
        queryFn: fetchReviewLevels,
        staleTime: 2 * 60 * 1000,
    });

    const { createMutation, updateMutation, deleteMutation } = useReviewLevelMutations({
        setSnackbar,
        onCreateSuccess: () => setFormOpen(false),
    });

    const localeText = useDataGridLocale();

    const handleToggleActive = useCallback(
        (row: ReviewLevel) => {
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

    const columns: GridColDef<ReviewLevel>[] = [
        { field: 'id', headerName: getString('idColumn'), width: 60 },
        {
            field: 'name_key',
            headerName: getString('name'),
            flex: 1,
            minWidth: 180,
            renderCell: (params) => (
                <Stack sx={{ py: 0.5 }}>
                    <Typography fontSize={13} fontWeight={500}>
                        {getString(params.row.name_key)}
                    </Typography>
                    <Typography fontSize={11} color="text.secondary">
                        {params.row.name_key}
                    </Typography>
                </Stack>
            ),
        },
        {
            field: 'description_key',
            headerName: getString('descriptionKeyCol'),
            flex: 1,
            minWidth: 200,
            renderCell: (params) =>
                params.row.description_key ? getString(params.row.description_key) : '—',
        },
        {
            field: 'requirements',
            headerName: getString('reviewLevelRequirements'),
            width: 110,
            renderCell: (params) => (
                <Chip
                    label={params.row.requirements?.length ?? 0}
                    size="small"
                    variant="outlined"
                />
            ),
        },
        { field: 'sort_order', headerName: getString('sortOrderCol'), width: 90 },
        {
            field: 'is_active',
            headerName: getString('isActiveCol'),
            width: 90,
            renderCell: (params) => (
                <Chip
                    label={params.row.is_active ? getString('yes') || 'Yes' : getString('no') || 'No'}
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
            width: 70,
            sortable: false,
            renderCell: (params) => (
                <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDelete(params.row.id)}
                    disabled={deleteMutation.isPending}
                >
                    <DeleteIcon fontSize="small" />
                </IconButton>
            ),
        },
    ];

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Typography variant="h6" fontWeight={600} sx={{ flex: 1 }}>
                    {getString('reviewLevels')}
                </Typography>
                <Button
                    variant="contained"
                    size="medium"
                    startIcon={<AddIcon />}
                    onClick={() => setFormOpen(true)}
                >
                    {getString('addReviewLevel')}
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

            <ReviewLevelForm
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
