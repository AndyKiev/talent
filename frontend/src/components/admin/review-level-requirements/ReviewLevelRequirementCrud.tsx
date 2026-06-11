import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Alert,
    Box,
    Button,
    Chip,
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
import DeleteIcon from '@mui/icons-material/Delete';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import useString from '../../../hooks/useString';
import { fetchReviewLevels } from '../review-levels/reviewLevelApi';
import { REVIEW_LEVEL_QK } from '../review-levels/useReviewLevelMutations';
import {
    fetchReviewLevelRequirements,
    type ReviewLevelRequirement,
} from './reviewLevelRequirementApi';
import {
    REVIEW_LEVEL_REQUIREMENT_QK,
    useReviewLevelRequirementMutations,
} from './useReviewLevelRequirementMutations';
import { ReviewLevelRequirementForm } from './ReviewLevelRequirementForm';
import { useDataGridLocale } from '../../../hooks/useDataGridLocale';

export function ReviewLevelRequirementCrud() {
    const getString = useString();
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error',
    });
    const [formOpen, setFormOpen] = useState(false);
    const [levelFilter, setLevelFilter] = useState<number | ''>('');
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });

    const { data: levels = [] } = useQuery({
        queryKey: REVIEW_LEVEL_QK,
        queryFn: fetchReviewLevels,
        staleTime: 2 * 60 * 1000,
    });

    const { data: allRows = [], isLoading, error } = useQuery({
        queryKey: REVIEW_LEVEL_REQUIREMENT_QK,
        queryFn: () => fetchReviewLevelRequirements(),
        staleTime: 2 * 60 * 1000,
    });

    const { createMutation, updateMutation, deleteMutation } =
        useReviewLevelRequirementMutations({
            setSnackbar,
            onCreateSuccess: () => setFormOpen(false),
        });

    const localeText = useDataGridLocale();

    const levelName = useCallback(
        (levelId: number) => {
            const lvl = levels.find((l) => l.id === levelId);
            return lvl ? getString(lvl.name_key) : String(levelId);
        },
        [levels, getString],
    );

    const rows = useMemo(
        () => (levelFilter === '' ? allRows : allRows.filter((r) => r.level_id === levelFilter)),
        [allRows, levelFilter],
    );

    const handleToggleActive = useCallback(
        (row: ReviewLevelRequirement) => {
            updateMutation.mutate({ id: row.id, data: { is_active: !row.is_active } });
        },
        [updateMutation],
    );

    const columns: GridColDef<ReviewLevelRequirement>[] = [
        { field: 'id', headerName: getString('idColumn'), width: 60 },
        {
            field: 'level_id',
            headerName: getString('levelCol'),
            width: 150,
            renderCell: (params) => levelName(params.row.level_id),
        },
        {
            field: 'text_key',
            headerName: getString('textKeyCol'),
            flex: 1,
            minWidth: 260,
            renderCell: (params) => (
                <Stack sx={{ py: 0.5 }}>
                    <Typography fontSize={13}>{getString(params.row.text_key)}</Typography>
                    <Typography fontSize={11} color="text.secondary">
                        {params.row.text_key}
                    </Typography>
                </Stack>
            ),
        },
        { field: 'sort_order', headerName: getString('sortOrderCol'), width: 90 },
        {
            field: 'is_active',
            headerName: getString('isActiveCol'),
            width: 90,
            renderCell: (params) => (
                <Chip
                    label={params.row.is_active ? getString('yes') : getString('no')}
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
                    onClick={() => deleteMutation.mutate(params.row.id)}
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
                    {getString('reviewLevelRequirements')}
                </Typography>
                <TextField
                    select
                    variant="outlined"
                    size="small"
                    label={getString('levelCol')}
                    value={levelFilter === '' ? '' : String(levelFilter)}
                    onChange={(e) =>
                        setLevelFilter(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    sx={{ minWidth: 180 }}
                >
                    <MenuItem value="">{getString('all')}</MenuItem>
                    {levels.map((lvl) => (
                        <MenuItem key={lvl.id} value={String(lvl.id)}>
                            {getString(lvl.name_key)}
                        </MenuItem>
                    ))}
                </TextField>
                <Button
                    variant="contained"
                    size="medium"
                    startIcon={<AddIcon />}
                    onClick={() => setFormOpen(true)}
                >
                    {getString('addReviewLevelRequirement')}
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

            <ReviewLevelRequirementForm
                open={formOpen}
                onClose={() => setFormOpen(false)}
                levels={levels}
                defaultLevelId={levelFilter}
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
