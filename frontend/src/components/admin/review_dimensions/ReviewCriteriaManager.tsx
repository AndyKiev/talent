import { useEffect, useMemo, useState } from 'react';
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
    TextField,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import useString from '../../../hooks/useString';
import {
    fetchReviewDimensions,
    fetchCriteria,
    type ReviewDimensionCriteria,
} from './reviewDimensionApi';
import { REVIEW_DIMENSION_QK } from './useReviewDimensionMutations';
import { REVIEW_CRITERIA_QK, useReviewCriteriaMutations } from './useReviewCriteriaMutations';
import { ReviewCriteriaForm } from './ReviewCriteriaForm';
import { useDataGridLocale } from '../../../hooks/useDataGridLocale';

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

    const { data: dimensions = [] } = useQuery({
        queryKey: REVIEW_DIMENSION_QK,
        queryFn: fetchReviewDimensions,
        staleTime: 2 * 60 * 1000,
    });

    // Default to the first dimension once the list loads.
    useEffect(() => {
        if (!dimensionId && dimensions.length > 0) setDimensionId(dimensions[0].id);
    }, [dimensions, dimensionId]);

    const { data: criteria = [], isLoading, error } = useQuery({
        queryKey: REVIEW_CRITERIA_QK(dimensionId),
        queryFn: () => fetchCriteria(dimensionId),
        enabled: !!dimensionId,
        staleTime: 60 * 1000,
    });

    const rows = useMemo(
        () => [...criteria].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id),
        [criteria],
    );

    const { createMutation, updateMutation, deleteMutation, reorderMutation } =
        useReviewCriteriaMutations({
            dimensionId,
            setSnackbar,
            onCreateSuccess: () => setFormOpen(false),
            onUpdateSuccess: () => setFormOpen(false),
        });

    const openCreate = () => {
        setEditing(null);
        setFormOpen(true);
    };
    const openEdit = (row: ReviewDimensionCriteria) => {
        setEditing(row);
        setFormOpen(true);
    };

    const move = (row: ReviewDimensionCriteria, dir: 'up' | 'down') => {
        const idx = rows.findIndex((r) => r.id === row.id);
        const swap = dir === 'up' ? idx - 1 : idx + 1;
        if (swap < 0 || swap >= rows.length) return;
        const next = [...rows];
        [next[idx], next[swap]] = [next[swap], next[idx]];
        reorderMutation.mutate(next.map((r) => ({ id: r.id, sort_order: r.sort_order })));
    };

    const columns: GridColDef<ReviewDimensionCriteria>[] = [
        {
            field: 'order',
            headerName: '#',
            width: 110,
            sortable: false,
            renderCell: (params) => {
                const idx = rows.findIndex((r) => r.id === params.row.id);
                return (
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Typography fontSize={13} sx={{ width: 20, textAlign: 'right' }}>
                            {idx + 1}
                        </Typography>
                        <IconButton
                            size="small"
                            onClick={() => move(params.row, 'up')}
                            disabled={idx === 0 || reorderMutation.isPending}
                        >
                            <ArrowUpwardIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                        <IconButton
                            size="small"
                            onClick={() => move(params.row, 'down')}
                            disabled={idx === rows.length - 1 || reorderMutation.isPending}
                        >
                            <ArrowDownwardIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                    </Stack>
                );
            },
        },
        { field: 'text', headerName: getString('criterionText'), flex: 1, minWidth: 320 },
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
                        onClick={() => deleteMutation.mutate(params.row.id)}
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
                    value={dimensionId ? String(dimensionId) : ''}
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
                    disabled={!dimensionId}
                >
                    {getString('addCriterion')}
                </Button>
            </Box>

            {!dimensionId && (
                <Alert severity="info" sx={{ borderRadius: '10px' }}>
                    {getString('selectDimension')}
                </Alert>
            )}

            {!!dimensionId && isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                </Box>
            )}

            {!!dimensionId && !isLoading && error && (
                <Alert severity="error" sx={{ m: 2 }}>
                    {(error as Error).message}
                </Alert>
            )}

            {!!dimensionId && !isLoading && !error && (
                <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                    <DataGrid
                        rows={rows}
                        columns={columns}
                        hideFooter
                        disableRowSelectionOnClick
                        getRowId={(row) => row.id}
                        getRowHeight={() => 'auto'}
                        localeText={localeText}
                        hideFooterSelectedRowCount
                        sx={{ '& .MuiDataGrid-cell': { alignItems: 'center', py: 1 } }}
                    />
                </Paper>
            )}

            <ReviewCriteriaForm
                open={formOpen}
                onClose={() => setFormOpen(false)}
                dimensionId={dimensionId}
                editing={editing}
                nextSortOrder={rows.length}
                createMutation={createMutation}
                updateMutation={updateMutation}
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
