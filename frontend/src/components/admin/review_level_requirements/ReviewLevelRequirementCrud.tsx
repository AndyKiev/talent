import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Alert,
    Box,
    Button,
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
import { fetchReviewLevels } from '../review_levels/reviewLevelApi';
import { REVIEW_LEVEL_QK } from '../review_levels/useReviewLevelMutations';
import {
    fetchReviewLevelRequirements,
    updateReviewLevelRequirement,
    type ReviewLevelRequirement,
} from './reviewLevelRequirementApi';
import {
    REVIEW_LEVEL_REQUIREMENT_QK,
    useReviewLevelRequirementMutations,
} from './useReviewLevelRequirementMutations';
import { useArrowReorder } from '../../../hooks/useArrowReorder';
import { ReviewLevelRequirementForm } from './ReviewLevelRequirementForm';
import { useDataGridLocale } from '../../../hooks/useDataGridLocale';
import ConfirmDialog from '../../ui/ConfirmDialog';
import ConfirmDeleteDialog from '../../ui/ConfirmDeleteDialog';
import { AsyncContent } from '../../ui/AsyncContent';

export function ReviewLevelRequirementCrud() {
    const getString = useString();
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error',
    });
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<ReviewLevelRequirement | null>(null);
    // A level is always selected (like the criteria manager's dimension) so the
    // per-level sort_order arrows reorder a single, fully-visible list. 0 means
    // "not yet chosen" -> fall back to the first level (derived, see below).
    const [levelId, setLevelId] = useState<number>(0);
    const [pendingToggle, setPendingToggle] = useState<ReviewLevelRequirement | null>(null);
    const [pendingDelete, setPendingDelete] = useState<ReviewLevelRequirement | null>(null);

    const { data: levels = [] } = useQuery({
        queryKey: REVIEW_LEVEL_QK,
        queryFn: fetchReviewLevels,
        staleTime: 2 * 60 * 1000,
    });

    // Default to the first level until the user picks one (no setState-in-effect).
    const effectiveLevelId = levelId || levels[0]?.id || 0;

    const { data: allRows = [], isLoading, error } = useQuery({
        queryKey: REVIEW_LEVEL_REQUIREMENT_QK,
        queryFn: () => fetchReviewLevelRequirements(),
        staleTime: 2 * 60 * 1000,
    });

    const { createMutation, updateMutation, deleteMutation } =
        useReviewLevelRequirementMutations({
            setSnackbar,
            onCreateSuccess: () => setFormOpen(false),
            onUpdateSuccess: () => setFormOpen(false),
        });

    const openCreate = () => {
        setEditing(null);
        setFormOpen(true);
    };
    const openEdit = (row: ReviewLevelRequirement) => {
        setEditing(row);
        setFormOpen(true);
    };

    const localeText = useDataGridLocale();

    // Requirements of the selected level only, active-first then by sort_order so
    // inactive sink to the bottom (matches the criteria manager).
    const rows = useMemo(
        () =>
            allRows
                .filter((r) => r.level_id === effectiveLevelId)
                .sort(
                    (a, b) =>
                        Number(b.is_active) - Number(a.is_active) ||
                        a.sort_order - b.sort_order ||
                        a.id - b.id,
                ),
        [allRows, effectiveLevelId],
    );

    // Shared up/down-arrow reordering. Invalidate the requirement list AND the
    // levels list (its requirement-count chip).
    const { orderColumn } = useArrowReorder<ReviewLevelRequirement>({
        rows,
        updateSortOrder: (id, sort_order) =>
            updateReviewLevelRequirement({ id, data: { sort_order } }),
        invalidateKeys: [REVIEW_LEVEL_REQUIREMENT_QK, REVIEW_LEVEL_QK],
        getString,
        onError: (message) => setSnackbar({ open: true, message, severity: 'error' }),
    });

    const columns: GridColDef<ReviewLevelRequirement>[] = [
        orderColumn,
        { field: 'id', headerName: getString('idColumn'), width: 60 },
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
                <Typography variant="h6" fontWeight={600}>
                    {getString('reviewLevelRequirements')}
                </Typography>
                <TextField
                    select
                    variant="outlined"
                    size="small"
                    label={getString('levelCol')}
                    value={effectiveLevelId ? String(effectiveLevelId) : ''}
                    onChange={(e) => setLevelId(Number(e.target.value))}
                    sx={{ minWidth: 180 }}
                >
                    {levels.map((lvl) => (
                        <MenuItem key={lvl.id} value={String(lvl.id)}>
                            {getString(lvl.name_key)}
                        </MenuItem>
                    ))}
                </TextField>
                <Box sx={{ flex: 1 }} />
                <Button
                    variant="contained"
                    size="medium"
                    startIcon={<AddIcon />}
                    onClick={openCreate}
                    disabled={!effectiveLevelId}
                >
                    {getString('addReviewLevelRequirement')}
                </Button>
            </Box>

            <AsyncContent isLoading={isLoading} error={error}>
                <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                    <DataGrid
                        rows={rows}
                        columns={columns}
                        hideFooter
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
            </AsyncContent>

            <ReviewLevelRequirementForm
                open={formOpen}
                onClose={() => setFormOpen(false)}
                levels={levels}
                defaultLevelId={effectiveLevelId}
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
                itemLabel={pendingDelete ? getString(pendingDelete.text_key) : undefined}
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
