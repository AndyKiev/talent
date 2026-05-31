import { useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
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
    Paper,
    Snackbar,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import DeleteIcon from '@mui/icons-material/Delete';
import PeopleIcon from '@mui/icons-material/People';
import ReplayIcon from '@mui/icons-material/Replay';
import BarChartIcon from '@mui/icons-material/BarChart';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';
import { SessionAnalyticsDialog } from './SessionAnalyticsDialog';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import AppShell from '../layout/AppShell.tsx';
import {
    fetchReviewSessions,
    createReviewSession,
    openReviewSession,
    closeReviewSession,
    revertReviewSession,
    deleteReviewSession,
    type ReviewSession,
    type ReviewSessionCreate,
    type MutationResponse,
} from './peopleReviewApi';
import { axiosInstance } from '../../api/axiosInstance';
import { BASE_URL } from '../../utils/eNums';

function formatDate(val: string | null | undefined): string {
    if (!val) return '—';
    const [y, m, d] = val.split('-');
    if (!y || !m || !d) return val;
    return `${d}.${m}.${y}`;
}

async function renameSession(id: number, name: string): Promise<MutationResponse<ReviewSession>> {
    const res = await axiosInstance.patch<MutationResponse<ReviewSession>>(
        `${BASE_URL}/review_sessions/${id}`,
        { name },
    );
    return res.data;
}
import { useDataGridLocale } from '../../hooks/useDataGridLocale';

const RS_QK = ['review_sessions'] as const;

const STATUS_COLORS: Record<string, 'default' | 'warning' | 'success' | 'error'> = {
    pending: 'default',
    open: 'success',
    closed: 'error',
};

export function ReviewSessionsPage() {
    const navigate = useNavigate();
    const qc = useQueryClient();
    const localeText = useDataGridLocale();

    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error',
    });
    const [formOpen, setFormOpen] = useState(false);
    const [formData, setFormData] = useState<ReviewSessionCreate>({
        name: '',
        description: '',
        period_start: null,
        period_end: null,
    });
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });
    const [analyticsSession, setAnalyticsSession] = useState<ReviewSession | null>(null);
    const [renameTarget, setRenameTarget] = useState<ReviewSession | null>(null);
    const [renameName, setRenameName] = useState('');

    const { data: rows = [], isLoading, error } = useQuery({
        queryKey: RS_QK,
        queryFn: fetchReviewSessions,
        staleTime: 60 * 1000,
    });

    const createMut = useMutation({
        mutationFn: createReviewSession,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: RS_QK });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            setFormOpen(false);
            setFormData({ name: '', description: '', period_start: null, period_end: null });
        },
        onError: (err: Error) => setSnackbar({ open: true, message: err.message, severity: 'error' }),
    });

    const openMut = useMutation({
        mutationFn: openReviewSession,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: RS_QK });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
        },
        onError: (err: Error) => setSnackbar({ open: true, message: err.message, severity: 'error' }),
    });

    const closeMut = useMutation({
        mutationFn: closeReviewSession,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: RS_QK });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
        },
        onError: (err: Error) => setSnackbar({ open: true, message: err.message, severity: 'error' }),
    });

    const deleteMut = useMutation({
        mutationFn: deleteReviewSession,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: RS_QK });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
        },
        onError: (err: Error) => setSnackbar({ open: true, message: err.message, severity: 'error' }),
    });

    const revertMut = useMutation({
        mutationFn: revertReviewSession,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: RS_QK });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
        },
        onError: (err: Error) => setSnackbar({ open: true, message: err.message, severity: 'error' }),
    });

    const renameMut = useMutation({
        mutationFn: ({ id, name }: { id: number; name: string }) => renameSession(id, name),
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: RS_QK });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            setRenameTarget(null);
        },
        onError: (err: Error) => setSnackbar({ open: true, message: err.message, severity: 'error' }),
    });

    const columns: GridColDef<ReviewSession>[] = [
        { field: 'id', headerName: 'ID', width: 60 },
        {
            field: 'name',
            headerName: 'Name',
            flex: 1,
            minWidth: 220,
            renderCell: (params) => (
                <Stack direction="row" alignItems="center" spacing={0.5} sx={{ width: '100%' }}>
                    <Typography fontSize={13} fontWeight={500} sx={{ flex: 1 }} noWrap>
                        {params.row.name}
                    </Typography>
                    <Tooltip title="Rename session">
                        <IconButton
                            size="small"
                            onClick={(e) => { e.stopPropagation(); setRenameTarget(params.row); setRenameName(params.row.name); }}
                            sx={{ opacity: 0.5, '&:hover': { opacity: 1 }, flexShrink: 0 }}
                        >
                            <DriveFileRenameOutlineIcon sx={{ fontSize: 15 }} />
                        </IconButton>
                    </Tooltip>
                </Stack>
            ),
        },
        {
            field: 'status',
            headerName: 'Status',
            width: 110,
            renderCell: (params) => (
                <Chip
                    label={params.row.status}
                    color={STATUS_COLORS[params.row.status] ?? 'default'}
                    size="small"
                    variant="outlined"
                />
            ),
        },
        {
            field: 'period_start',
            headerName: 'Period Start',
            width: 120,
            valueFormatter: (value) => formatDate(value as string),
        },
        {
            field: 'period_end',
            headerName: 'Period End',
            width: 120,
            valueFormatter: (value) => formatDate(value as string),
        },
        {
            field: 'employee_count',
            headerName: 'Employees',
            width: 100,
            align: 'center',
        },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 260,
            sortable: false,
            renderCell: (params) => {
                const row = params.row;
                return (
                    <Stack direction="row" spacing={0.5} alignItems="center" height="100%">
                        {/* Analytics button — available for open and closed sessions */}
                        {(row.status === 'open' || row.status === 'closed') && (
                            <Tooltip title="View analytics">
                                <IconButton
                                    size="small"
                                    onClick={() => setAnalyticsSession(row)}
                                    sx={{ color: '#7B1FA2' }}
                                >
                                    <BarChartIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        )}
                        {row.status === 'pending' && (
                            <Button
                                size="small"
                                variant="contained"
                                color="success"
                                startIcon={<PlayArrowIcon />}
                                onClick={() => openMut.mutate(row.id)}
                                disabled={openMut.isPending}
                            >
                                Open
                            </Button>
                        )}
                        {row.status === 'open' && (
                            <>
                                <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={() =>
                                        navigate({
                                            to: '/people-review/$sessionId' as any,
                                            params: { sessionId: String(row.id) },
                                        })
                                    }
                                >
                                    <PeopleIcon />
                                </IconButton>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    color="error"
                                    startIcon={<StopIcon />}
                                    onClick={() => closeMut.mutate(row.id)}
                                    disabled={closeMut.isPending}
                                >
                                    Close
                                </Button>
                            </>
                        )}
                        {row.status === 'closed' && (
                            <>
                                <IconButton
                                    size="small" color="primary"
                                    onClick={() => navigate({ to: '/people-review/$sessionId' as any, params: { sessionId: String(row.id) } })}
                                >
                                    <PeopleIcon />
                                </IconButton>
                                <Button
                                    size="small" variant="outlined" startIcon={<ReplayIcon />}
                                    onClick={() => revertMut.mutate(row.id)}
                                    disabled={revertMut.isPending}
                                    sx={{ textTransform: 'none', fontWeight: 600, fontSize: 12 }}
                                >
                                    Revert to Open
                                </Button>
                            </>
                        )}
                        {row.status === 'pending' && (
                            <IconButton
                                size="small"
                                color="error"
                                onClick={() => deleteMut.mutate(row.id)}
                                disabled={deleteMut.isPending}
                            >
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        )}
                    </Stack>
                );
            },
        },
    ];

    return (
        <AppShell>
            <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: '100%', px: { xs: 2, sm: 4, md: 6 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Typography variant="h5" fontWeight={600} sx={{ flex: 1 }}>
                        People Review Sessions
                    </Typography>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setFormOpen(true)}
                    >
                        New Session
                    </Button>
                </Box>

                {isLoading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress />
                    </Box>
                )}

                {!isLoading && error && (
                    <Alert severity="error">{(error as Error).message}</Alert>
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
                            localeText={localeText}
                            hideFooterSelectedRowCount
                            sx={{ '& .MuiDataGrid-cell': { alignItems: 'center', py: 1 } }}
                        />
                    </Paper>
                )}

                {/* Create Dialog */}
                <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
                    <DialogTitle>Create Review Session</DialogTitle>
                    <DialogContent>
                        <Stack spacing={2} sx={{ mt: 1 }}>
                            <TextField
                                label="Session Name"
                                value={formData.name}
                                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                                fullWidth
                                required
                            />
                            <TextField
                                label="Description"
                                value={formData.description ?? ''}
                                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                                fullWidth
                                multiline
                                rows={2}
                            />
                            <TextField
                                label="Period Start"
                                type="date"
                                value={formData.period_start ?? ''}
                                onChange={(e) =>
                                    setFormData((p) => ({ ...p, period_start: e.target.value || null }))
                                }
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                            />
                            <TextField
                                label="Period End"
                                type="date"
                                value={formData.period_end ?? ''}
                                onChange={(e) =>
                                    setFormData((p) => ({ ...p, period_end: e.target.value || null }))
                                }
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                            />
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setFormOpen(false)}>Cancel</Button>
                        <Button
                            variant="contained"
                            onClick={() => createMut.mutate(formData)}
                            disabled={!formData.name || createMut.isPending}
                        >
                            {createMut.isPending ? 'Creating...' : 'Create'}
                        </Button>
                    </DialogActions>
                </Dialog>

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

            {/* Rename dialog */}
            <Dialog open={!!renameTarget} onClose={() => setRenameTarget(null)} maxWidth="xs" fullWidth>
                <DialogTitle>Rename session</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        fullWidth
                        label="Session name"
                        value={renameName}
                        onChange={(e) => setRenameName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && renameName.trim() && renameTarget) {
                                renameMut.mutate({ id: renameTarget.id, name: renameName.trim() });
                            }
                        }}
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRenameTarget(null)}>Cancel</Button>
                    <Button
                        variant="contained"
                        disabled={!renameName.trim() || renameMut.isPending}
                        onClick={() => renameTarget && renameMut.mutate({ id: renameTarget.id, name: renameName.trim() })}
                    >
                        {renameMut.isPending ? 'Saving…' : 'Save'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Analytics dialog */}
            {analyticsSession && (
                <SessionAnalyticsDialog
                    sessionId={analyticsSession.id}
                    sessionName={analyticsSession.name}
                    open={!!analyticsSession}
                    onClose={() => setAnalyticsSession(null)}
                />
            )}
        </AppShell>
    );
}
