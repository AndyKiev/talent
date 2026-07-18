import { useMemo, useState } from 'react';
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
    Switch,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import useString from '../../../hooks/useString';
import { fetchReviewLevels, updateReviewLevel, type ReviewLevel } from './reviewLevelApi';
import { REVIEW_LEVEL_QK, useReviewLevelMutations } from './useReviewLevelMutations';
import { useArrowReorder } from '../../../hooks/useArrowReorder';
import { ReviewLevelForm } from './ReviewLevelForm';
import { useDataGridLocale } from '../../../hooks/useDataGridLocale';
import ConfirmDialog from '../../ui/ConfirmDialog';
import ConfirmDeleteDialog from '../../ui/ConfirmDeleteDialog';

export function ReviewLevelCrud() {
    const getString = useString();
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error',
    });
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<ReviewLevel | null>(null);
    const [pendingToggle, setPendingToggle] = useState<ReviewLevel | null>(null);
    const [pendingDelete, setPendingDelete] = useState<ReviewLevel | null>(null);
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });

    const { data: rows = [], isLoading, error } = useQuery({
        queryKey: REVIEW_LEVEL_QK,
        queryFn: fetchReviewLevels,
        staleTime: 2 * 60 * 1000,
    });

    // Active first (inactive sink to the bottom), then by sort_order. Only active
    // levels are frozen into a new session, so keeping them grouped on top makes
    // the "what will a new review use" set obvious at a glance.
    const sortedRows = useMemo(
        () =>
            [...rows].sort(
                (a, b) =>
                    Number(b.is_active) - Number(a.is_active) ||
                    a.sort_order - b.sort_order ||
                    a.id - b.id,
            ),
        [rows],
    );

    const { createMutation, updateMutation, deleteMutation } = useReviewLevelMutations({
        setSnackbar,
        onCreateSuccess: () => setFormOpen(false),
        onUpdateSuccess: () => setFormOpen(false),
    });

    const localeText = useDataGridLocale();

    // Shared up/down-arrow reordering (same logic as the criteria/dimensions grids).
    const { orderColumn } = useArrowReorder<ReviewLevel>({
        rows: sortedRows,
        updateSortOrder: (id, sort_order) => updateReviewLevel({ id, data: { sort_order } }),
        invalidateKeys: [REVIEW_LEVEL_QK],
        getString,
        onError: (message) => setSnackbar({ open: true, message, severity: 'error' }),
    });

    const openCreate = () => {
        setEditing(null);
        setFormOpen(true);
    };
    const openEdit = (row: ReviewLevel) => {
        setEditing(row);
        setFormOpen(true);
    };

    const columns: GridColDef<ReviewLevel>[] = [
        orderColumn,
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
        {
            field: 'is_active',
            headerName: getString('active'),
            width: 90,
            sortable: false,
            renderCell: (params) => (
                <Switch
                    size="small"
                    checked={params.row.is_active}
                    onChange={() => setPendingToggle(params.row)}
                    disabled={updateMutation.isPending}
                />
            ),
        },
        {
            field: 'actions',
            headerName: '',
            width: 90,
            sortable: false,
            renderCell: (params) => (
                <Stack direction="row" spacing={0.5}>
                    <IconButton size="small" onClick={() => openEdit(params.row)}>
                        <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                        size="small"
                        color="error"
                        onClick={() => setPendingDelete(params.row)}
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
                    {getString('reviewLevels')}
                </Typography>
                <Button variant="contained" size="medium" startIcon={<AddIcon />} onClick={openCreate}>
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
                        rows={sortedRows}
                        columns={columns}
                        paginationModel={paginationModel}
                        onPaginationModelChange={setPaginationModel}
                        pageSizeOptions={[5, 10, 25]}
                        disableRowSelectionOnClick
                        getRowId={(row) => row.id}
                        getRowHeight={() => 'auto'}
                        getRowClassName={(params) =>
                            params.row.is_active ? '' : 'review-row-inactive'
                        }
                        localeText={localeText}
                        hideFooterSelectedRowCount
                        sx={{
                            '& .MuiDataGrid-cell': { alignItems: 'center', py: 1 },
                            '& .review-row-inactive': { opacity: 0.5 },
                        }}
                    />
                </Paper>
            )}

            <ReviewLevelForm
                open={formOpen}
                onClose={() => setFormOpen(false)}
                editing={editing}
                createMutation={createMutation}
                updateMutation={updateMutation}
            />

            <ConfirmDialog
                open={pendingToggle !== null}
                title={getString('confirmToggleActiveTitle')}
                message={
                    pendingToggle?.is_active
                        ? getString('confirmDeactivateMessage')
                        : getString('confirmActivateMessage')
                }
                confirmColor="warning"
                isPending={updateMutation.isPending}
                onConfirm={() => {
                    if (pendingToggle) {
                        updateMutation.mutate({
                            id: pendingToggle.id,
                            data: { is_active: !pendingToggle.is_active },
                        });
                    }
                    setPendingToggle(null);
                }}
                onClose={() => setPendingToggle(null)}
            />

            <ConfirmDeleteDialog
                open={pendingDelete !== null}
                message={getString('confirmDeleteMessage')}
                itemLabel={pendingDelete ? getString(pendingDelete.name_key) : undefined}
                isDeleting={deleteMutation.isPending}
                onConfirm={() => {
                    if (pendingDelete) deleteMutation.mutate(pendingDelete.id);
                    setPendingDelete(null);
                }}
                onClose={() => setPendingDelete(null)}
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
