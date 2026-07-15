import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Paper,
    Snackbar,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import useString from '../../../../hooks/useString';
import { snakeToCamel } from '../../../../utils/helpers.ts';
import { useDataGridLocale } from '../../../../hooks/useDataGridLocale';
import { centeredGridCellsSx } from '../../../../utils/dataGridSx';
import ConfirmDeleteDialog from '../../../people-review/ConfirmDeleteDialog';
import { CANDIDATE_SOURCE_QK } from '../../../../utils/queryKeys';
import {
    fetchCandidateSources,
    createCandidateSource,
    updateCandidateSource,
    deleteCandidateSource,
    type CandidateSource,
} from './candidateSourceApi';

export function CandidateSourceCrud() {
    const getString = useString();
    const qc = useQueryClient();
    const localeText = useDataGridLocale();

    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<CandidateSource | null>(null);
    const [keyValue, setKeyValue] = useState('');
    const [description, setDescription] = useState('');
    const [sortOrder, setSortOrder] = useState(0);
    const [pendingDelete, setPendingDelete] = useState<CandidateSource | null>(null);

    const { data: sources = [], isLoading, error } = useQuery({
        queryKey: CANDIDATE_SOURCE_QK,
        queryFn: fetchCandidateSources,
    });

    const invalidate = () => qc.invalidateQueries({ queryKey: CANDIDATE_SOURCE_QK });
    const ok = (message: string) => setSnackbar({ open: true, message, severity: 'success' });
    const fail = (message: string) => setSnackbar({ open: true, message, severity: 'error' });

    const createMutation = useMutation({
        mutationFn: createCandidateSource,
        onSuccess: async (res) => { await invalidate(); ok(res.detail); setFormOpen(false); },
        onError: (e: Error) => fail(e.message),
    });
    const updateMutation = useMutation({
        mutationFn: updateCandidateSource,
        onSuccess: async (res) => { await invalidate(); ok(res.detail); setFormOpen(false); },
        onError: (e: Error) => fail(e.message),
    });
    const deleteMutation = useMutation({
        mutationFn: deleteCandidateSource,
        onSuccess: async (res) => { await invalidate(); ok(res.detail); },
        onError: (e: Error) => fail(e.message),
    });

    const openCreate = () => {
        setEditing(null);
        setKeyValue('');
        setDescription('');
        setSortOrder(sources.length);
        setFormOpen(true);
    };
    const openEdit = (row: CandidateSource) => {
        setEditing(row);
        setKeyValue(row.key);
        setDescription(row.description ?? '');
        setSortOrder(row.sort_order);
        setFormOpen(true);
    };

    const handleSubmit = () => {
        const key = keyValue.trim();
        if (!key) return;
        const data = { key, description: description.trim() || null, sort_order: sortOrder };
        if (editing) updateMutation.mutate({ id: editing.id, data });
        else createMutation.mutate(data);
    };

    const pending = createMutation.isPending || updateMutation.isPending;

    const columns: GridColDef<CandidateSource>[] = [
        {
            field: 'key',
            headerName: getString('key') || 'Key',
            flex: 1,
            minWidth: 160,
            renderCell: (p) => (
                <Typography variant="body2">{getString(snakeToCamel(p.row.key)) || p.row.key}</Typography>
            ),
        },
        { field: 'description', headerName: getString('description') || 'Description', flex: 1, minWidth: 200 },
        { field: 'sort_order', headerName: getString('sortOrder') || 'Order', width: 100 },
        {
            field: 'actions',
            headerName: '',
            width: 100,
            sortable: false,
            renderCell: (p) => (
                <Stack direction="row" spacing={0.5}>
                    <IconButton size="small" onClick={() => openEdit(p.row)}>
                        <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => setPendingDelete(p.row)}>
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </Stack>
            ),
        },
    ];

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                <Tooltip title={getString('addCandidateSource') || 'Add source'}>
                    <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={openCreate}>
                        {getString('addCandidateSource') || 'Add source'}
                    </Button>
                </Tooltip>
            </Box>

            {!isLoading && error && <Alert severity="error">{(error as Error).message}</Alert>}

            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                <DataGrid
                    rows={sources}
                    columns={columns}
                    getRowId={(r) => r.id}
                    loading={isLoading}
                    hideFooter
                    disableRowSelectionOnClick
                    localeText={localeText}
                    autoHeight
                    sx={{ ...centeredGridCellsSx }}
                />
            </Paper>

            <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {editing
                        ? getString('editCandidateSource') || 'Edit source'
                        : getString('addCandidateSource') || 'Add source'}
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            label={getString('key') || 'Key'}
                            value={keyValue}
                            onChange={(e) => setKeyValue(e.target.value)}
                            fullWidth
                            required
                            helperText={getString('candidateSourceKeyHint') || 'snake_case identifier, e.g. linkedin'}
                        />
                        <TextField
                            label={getString('description') || 'Description'}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            fullWidth
                            multiline
                            rows={2}
                        />
                        <TextField
                            label={getString('sortOrder') || 'Order'}
                            value={sortOrder}
                            onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
                            type="number"
                            fullWidth
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setFormOpen(false)}>{getString('cancel') || 'Cancel'}</Button>
                    <Button variant="contained" onClick={handleSubmit} disabled={!keyValue.trim() || pending}>
                        {pending
                            ? getString('saving') || 'Saving…'
                            : editing
                              ? getString('save') || 'Save'
                              : getString('create') || 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            <ConfirmDeleteDialog
                open={pendingDelete !== null}
                message={getString('confirmDeleteMessage')}
                itemLabel={pendingDelete ? getString(snakeToCamel(pendingDelete.key)) || pendingDelete.key : undefined}
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
                <Alert severity={snackbar.severity} onClose={() => setSnackbar((p) => ({ ...p, open: false }))} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
