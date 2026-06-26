import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    IconButton,
    MenuItem,
    Paper,
    Snackbar,
    Stack,
    Switch,
    TextField,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import useString from '../../../hooks/useString';
import {
    fetchReviewDimensions,
    fetchCriteria,
    updateCriteria,
    type ReviewDimensionCriteria,
} from './reviewDimensionApi';
import { REVIEW_DIMENSION_QK } from './useReviewDimensionMutations';
import { REVIEW_CRITERIA_QK, useReviewCriteriaMutations } from './useReviewCriteriaMutations';
import { useArrowReorder } from './useArrowReorder';
import { ReviewCriteriaForm } from './ReviewCriteriaForm';
import { useDataGridLocale } from '../../../hooks/useDataGridLocale';
import ConfirmDialog from '../../ui/ConfirmDialog';
import ConfirmDeleteDialog from '../../people-review/ConfirmDeleteDialog';

export function ReviewCriteriaManager() {
    const getString = useString();
    const localeText = useDataGridLocale();

    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error',
    });
    const [dimensionId, setDimensionId] = useState<number>(0);
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<ReviewDimensionCriteria | null>(null);
    const [pendingToggle, setPendingToggle] = useState<ReviewDimensionCriteria | null>(null);
    const [pendingDelete, setPendingDelete] = useState<ReviewDimensionCriteria | null>(null);

    const { data: dimensions = [] } = useQuery({
        queryKey: REVIEW_DIMENSION_QK,
        queryFn: fetchReviewDimensions,
        staleTime: 2 * 60 * 1000,
    });

    // Default to the first dimension until the user picks one (no setState-in-effect).
    const effectiveDimensionId = dimensionId || dimensions[0]?.id || 0;

    const { data: criteria = [], isLoading, error } = useQuery({
        queryKey: REVIEW_CRITERIA_QK(effectiveDimensionId),
        queryFn: () => fetchCriteria(effectiveDimensionId),
        enabled: !!effectiveDimensionId,
        staleTime: 60 * 1000,
    });

    // Active first (inactive sink to the bottom), then by sort_order. Only active
    // criteria are frozen into a new session, so keeping them grouped on top makes
    // the "what will a new review use" set obvious at a glance.
    const rows = useMemo(
        () =>
            [...criteria].sort(
                (a, b) =>
                    Number(b.is_active) - Number(a.is_active) ||
                    a.sort_order - b.sort_order ||
                    a.id - b.id,
            ),
        [criteria],
    );

    const { createMutation, updateMutation, deleteMutation } = useReviewCriteriaMutations({
        dimensionId: effectiveDimensionId,
        setSnackbar,
        onCreateSuccess: () => setFormOpen(false),
        onUpdateSuccess: () => setFormOpen(false),
    });

    // Shared up/down-arrow reordering. Invalidate both the criteria list AND the
    // dimensions list (its criteria-count chip).
    const { orderColumn } = useArrowReorder<ReviewDimensionCriteria>({
        rows,
        updateSortOrder: (id, sort_order) => updateCriteria({ id, data: { sort_order } }),
        invalidateKeys: [REVIEW_CRITERIA_QK(effectiveDimensionId), REVIEW_DIMENSION_QK],
        getString,
        onError: (message) => setSnackbar({ open: true, message, severity: 'error' }),
    });

    const openCreate = () => {
        setEditing(null);
        setFormOpen(true);
    };
    const openEdit = (row: ReviewDimensionCriteria) => {
        setEditing(row);
        setFormOpen(true);
    };

    const columns: GridColDef<ReviewDimensionCriteria>[] = [
        orderColumn,
        { field: 'text', headerName: getString('criterionText'), flex: 1, minWidth: 320 },
        {
            field: 'is_active',
            headerName: getString('active'),
            width: 110,
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                <Typography variant="h6" fontWeight={600}>
                    {getString('criteria')}
                </Typography>
                <TextField
                    select
                    variant="outlined"
                    size="small"
                    label={getString('selectDimension')}
                    value={effectiveDimensionId ? String(effectiveDimensionId) : ''}
                    onChange={(e) => setDimensionId(Number(e.target.value))}
                    sx={{ minWidth: 240 }}
                >
                    {dimensions.map((d) => (
                        <MenuItem key={d.id} value={String(d.id)}>
                            {d.name}
                        </MenuItem>
                    ))}
                </TextField>
                <Box sx={{ flex: 1 }} />
                <Button
                    variant="contained"
                    size="medium"
                    startIcon={<AddIcon />}
                    onClick={openCreate}
                    disabled={!effectiveDimensionId}
                >
                    {getString('addCriterion')}
                </Button>
            </Box>

            {!effectiveDimensionId && (
                <Alert severity="info" sx={{ borderRadius: '10px' }}>
                    {getString('selectDimension')}
                </Alert>
            )}

            {!!effectiveDimensionId && isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                </Box>
            )}

            {!!effectiveDimensionId && !isLoading && error && (
                <Alert severity="error" sx={{ m: 2 }}>
                    {(error as Error).message}
                </Alert>
            )}

            {!!effectiveDimensionId && !isLoading && !error && (
                <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                    <DataGrid
                        rows={rows}
                        columns={columns}
                        hideFooter
                        disableRowSelectionOnClick
                        getRowId={(row) => row.id}
                        getRowHeight={() => 'auto'}
                        getRowClassName={(params) =>
                            params.row.is_active ? '' : 'criteria-row-inactive'
                        }
                        localeText={localeText}
                        hideFooterSelectedRowCount
                        sx={{
                            '& .MuiDataGrid-cell': { alignItems: 'center', py: 1 },
                            '& .criteria-row-inactive': { opacity: 0.5 },
                        }}
                    />
                </Paper>
            )}

            <ReviewCriteriaForm
                open={formOpen}
                onClose={() => setFormOpen(false)}
                dimensionId={effectiveDimensionId}
                editing={editing}
                nextSortOrder={rows.length}
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
                getString={getString}
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
                itemLabel={pendingDelete?.text}
                isDeleting={deleteMutation.isPending}
                getString={getString}
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
