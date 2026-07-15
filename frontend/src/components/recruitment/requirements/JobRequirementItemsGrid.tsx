import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    MenuItem,
    Paper,
    Stack,
    TextField,
    Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { useArrowReorder } from '../../admin/review_dimensions/useArrowReorder';
import { useDataGridLocale } from '../../../hooks/useDataGridLocale';
import { centeredGridCellsSx } from '../../../utils/dataGridSx';
import { JOB_REQUIREMENT_ITEMS_QK, JOB_REQUIREMENT_GROUPS_QK } from '../../../utils/queryKeys';
import type { GetStringFn } from '../../../types/getStringFn';
import {
    fetchJobRequirementItems,
    createJobRequirementItem,
    updateJobRequirementItem,
    deleteJobRequirementItem,
    type JobRequirementItem,
    type RecruitmentDimension,
} from './jobRequirementApi';

interface Props {
    groupId: number;
    jobId: number;
    dimensions: RecruitmentDimension[];
    getString: GetStringFn;
    onError: (message: string) => void;
}

export function JobRequirementItemsGrid({ groupId, jobId, dimensions, getString, onError }: Props) {
    const qc = useQueryClient();
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<JobRequirementItem | null>(null);
    const [dimensionId, setDimensionId] = useState<number | ''>('');
    const [text, setText] = useState('');

    const { data: items = [], isLoading } = useQuery({
        queryKey: JOB_REQUIREMENT_ITEMS_QK(groupId),
        queryFn: () => fetchJobRequirementItems(groupId),
    });

    const sortedItems = useMemo(
        () => [...items].sort((a, b) => (a.sort_order - b.sort_order) || (a.id - b.id)),
        [items],
    );

    const localeText = useDataGridLocale();

    const invalidate = async () => {
        await qc.invalidateQueries({ queryKey: JOB_REQUIREMENT_ITEMS_QK(groupId) });
        // Refresh the parent group list so its point-count chip stays accurate.
        await qc.invalidateQueries({ queryKey: JOB_REQUIREMENT_GROUPS_QK(jobId) });
    };

    const createMutation = useMutation({
        mutationFn: createJobRequirementItem,
        onSuccess: async () => {
            await invalidate();
            setFormOpen(false);
        },
        onError: (err: Error) => onError(err.message),
    });

    const updateMutation = useMutation({
        mutationFn: updateJobRequirementItem,
        onSuccess: async () => {
            await invalidate();
            setFormOpen(false);
        },
        onError: (err: Error) => onError(err.message),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteJobRequirementItem,
        onSuccess: invalidate,
        onError: (err: Error) => onError(err.message),
    });

    const { orderColumn } = useArrowReorder<JobRequirementItem>({
        rows: sortedItems,
        updateSortOrder: (id, sort_order) => updateJobRequirementItem({ id, data: { sort_order } }),
        invalidateKeys: [JOB_REQUIREMENT_ITEMS_QK(groupId)],
        getString,
        onError,
    });

    const openCreate = () => {
        setEditing(null);
        setDimensionId(dimensions[0]?.id ?? '');
        setText('');
        setFormOpen(true);
    };
    const openEdit = (row: JobRequirementItem) => {
        setEditing(row);
        setDimensionId(row.dimension_id);
        setText(row.text);
        setFormOpen(true);
    };

    const handleSubmit = () => {
        if (dimensionId === '' || !text.trim()) return;
        if (editing) {
            updateMutation.mutate({ id: editing.id, data: { dimension_id: dimensionId, text: text.trim() } });
        } else {
            createMutation.mutate({
                group_id: groupId,
                dimension_id: dimensionId,
                text: text.trim(),
                sort_order: sortedItems.length,
            });
        }
    };

    const columns: GridColDef<JobRequirementItem>[] = [
        orderColumn,
        {
            field: 'dimension_id',
            headerName: getString('dimension') || 'Dimension',
            width: 180,
            sortable: false,
            renderCell: (params) => {
                const dim = dimensions.find((d) => d.id === params.row.dimension_id) ?? params.row.dimension;
                return (
                    <Chip
                        label={dim?.name ?? params.row.dimension_id}
                        size="small"
                        sx={{
                            bgcolor: dim?.color ?? undefined,
                            color: dim?.color ? '#fff' : undefined,
                        }}
                    />
                );
            },
        },
        {
            field: 'text',
            headerName: getString('requirementItemText') || 'Text',
            flex: 1,
            minWidth: 240,
            sortable: false,
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
                        onClick={() => deleteMutation.mutate(params.row.id)}
                        disabled={deleteMutation.isPending}
                    >
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </Stack>
            ),
        },
    ];

    const pending = createMutation.isPending || updateMutation.isPending;

    const noDimensions = dimensions.length === 0;

    return (
        <Box>
            {noDimensions && (
                <Alert severity="info" sx={{ mb: 1 }}>
                    {getString('recruitmentNoDimensionsHint') ||
                        'Create a recruitment dimension first (Admin → Recruitment → Dimensions) — every requirement point belongs to a dimension.'}
                </Alert>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                <Tooltip
                    title={
                        noDimensions
                            ? getString('recruitmentNoDimensionsHint') ||
                              'Create a recruitment dimension first (Admin → Recruitment → Dimensions)'
                            : ''
                    }
                >
                    <span>
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<AddIcon />}
                            onClick={openCreate}
                            disabled={noDimensions}
                        >
                            {getString('addRequirementItem') || 'Add point'}
                        </Button>
                    </span>
                </Tooltip>
            </Box>

            {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress size={22} />
                </Box>
            ) : (
                <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                    <DataGrid
                        rows={sortedItems}
                        columns={columns}
                        getRowId={(row) => row.id}
                        getRowHeight={() => 'auto'}
                        hideFooter
                        disableRowSelectionOnClick
                        localeText={localeText}
                        autoHeight
                        sx={{ ...centeredGridCellsSx, '& .MuiDataGrid-cell': { py: 1 } }}
                    />
                </Paper>
            )}

            <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {getString(editing ? 'editRequirementItem' : 'addRequirementItem') ||
                        (editing ? 'Edit point' : 'Add point')}
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            select
                            variant="outlined"
                            label={getString('dimension') || 'Dimension'}
                            value={dimensionId}
                            onChange={(e) => setDimensionId(Number(e.target.value))}
                            fullWidth
                        >
                            {dimensions.map((d) => (
                                <MenuItem key={d.id} value={d.id}>
                                    {d.name}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            label={getString('requirementItemText') || 'Text'}
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            fullWidth
                            multiline
                            rows={3}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setFormOpen(false)}>{getString('cancel') || 'Cancel'}</Button>
                    <Button
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={dimensionId === '' || !text.trim() || pending}
                    >
                        {pending ? getString('saving') || 'Saving…' : getString(editing ? 'save' : 'create') || 'Save'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
