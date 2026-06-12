import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
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
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
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
import { BASE_URL, DATE_FORMAT } from '../../utils/eNums';
import useString from '../../hooks/useString';

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

const STATUS_LABEL_KEYS: Record<string, string> = {
    pending: 'statusPending',
    open: 'statusOpen',
    closed: 'statusClosed',
};

export function ReviewSessionsPage() {
    const navigate = useNavigate();
    const qc = useQueryClient();
    const localeText = useDataGridLocale();
    const getString = useString();

    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error',
    });
    const [formOpen, setFormOpen] = useState(false);
    const EMPTY_FORM: ReviewSessionCreate = {
        name: '',
        description: '',
        period_start: null,
        period_end: null,
    };
    const { control, handleSubmit, reset, formState: { errors } } = useForm<ReviewSessionCreate>({
        defaultValues: EMPTY_FORM,
    });
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });
    const [analyticsSession, setAnalyticsSession] = useState<ReviewSession | null>(null);
    const [renameTarget, setRenameTarget] = useState<ReviewSession | null>(null);
    const [renameName, setRenameName] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<ReviewSession | null>(null);

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
            reset(EMPTY_FORM);
        },
        onError: (err: Error) => setSnackbar({ open: true, message: err.message, severity: 'error' }),
    });

    const closeForm = () => {
        setFormOpen(false);
        reset(EMPTY_FORM);
    };

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
            setDeleteTarget(null);
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
        { field: 'id', headerName: getString('idColumn'), width: 60 },
        {
            field: 'name',
            headerName: getString('name'),
            flex: 1,
            minWidth: 220,
            renderCell: (params) => (
                <Stack direction="row" alignItems="center" spacing={0.5} sx={{ width: '100%' }}>
                    <Typography fontSize={13} fontWeight={500} sx={{ flex: 1 }} noWrap>
                        {params.row.name}
                    </Typography>
                    <Tooltip title={getString('renameSession')}>
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
            headerName: getString('status'),
            width: 110,
            renderCell: (params) => (
                <Chip
                    label={
                        STATUS_LABEL_KEYS[params.row.status]
                            ? getString(STATUS_LABEL_KEYS[params.row.status])
                            : params.row.status
                    }
                    color={STATUS_COLORS[params.row.status] ?? 'default'}
                    size="small"
                    variant="outlined"
                />
            ),
        },
        {
            field: 'period_start',
            headerName: getString('periodStart'),
            width: 120,
            valueFormatter: (value) => formatDate(value as string),
        },
        {
            field: 'period_end',
            headerName: getString('periodEnd'),
            width: 120,
            valueFormatter: (value) => formatDate(value as string),
        },
        {
            field: 'employee_count',
            headerName: getString('employees'),
            width: 100,
            align: 'center',
        },
        {
            field: 'actions',
            headerName: getString('actions'),
            width: 260,
            sortable: false,
            renderCell: (params) => {
                const row = params.row;
                return (
                    <Stack direction="row" spacing={0.5} alignItems="center" height="100%">
                        {/* Analytics button — available for open and closed sessions */}
                        {(row.status === 'open' || row.status === 'closed') && (
                            <Tooltip title={getString('viewAnalytics')}>
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
                                {getString('openAction')}
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
                                    {getString('close')}
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
                                    {getString('revertToOpen')}
                                </Button>
                            </>
                        )}
                        <Tooltip title={getString('deleteSessionTooltip')}>
                            <IconButton
                                size="small"
                                color="error"
                                onClick={() => setDeleteTarget(row)}
                                disabled={deleteMut.isPending}
                            >
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
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
                        {getString('peopleReviewSessions')}
                    </Typography>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setFormOpen(true)}
                    >
                        {getString('newSession')}
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
                            sx={{ '& .MuiDataGrid-cell': { display: 'flex', alignItems: 'center', py: 1 } }}
                        />
                    </Paper>
                )}

                {/* Create Dialog */}
                <Dialog open={formOpen} onClose={closeForm} maxWidth="sm" fullWidth>
                    <form onSubmit={handleSubmit((values) => createMut.mutate(values))} noValidate>
                        <DialogTitle>{getString('createReviewSessionTitle')}</DialogTitle>
                        <DialogContent>
                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <Stack spacing={2} sx={{ mt: 1 }}>
                                    <Controller
                                        name="name"
                                        control={control}
                                        rules={{ required: true }}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                label={getString('sessionName')}
                                                fullWidth
                                                required
                                                error={!!errors.name}
                                                helperText={errors.name ? getString('fieldRequired') : ''}
                                            />
                                        )}
                                    />
                                    <Controller
                                        name="description"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                value={field.value ?? ''}
                                                label={getString('description')}
                                                fullWidth
                                                multiline
                                                rows={2}
                                            />
                                        )}
                                    />
                                    <Controller
                                        name="period_start"
                                        control={control}
                                        render={({ field }) => (
                                            <DatePicker
                                                label={getString('periodStart')}
                                                format={DATE_FORMAT}
                                                value={field.value ? dayjs(field.value) : null}
                                                onChange={(d) => field.onChange(d ? dayjs(d).format('YYYY-MM-DD') : null)}
                                                slotProps={{ textField: { fullWidth: true } }}
                                            />
                                        )}
                                    />
                                    <Controller
                                        name="period_end"
                                        control={control}
                                        render={({ field }) => (
                                            <DatePicker
                                                label={getString('periodEnd')}
                                                format={DATE_FORMAT}
                                                value={field.value ? dayjs(field.value) : null}
                                                onChange={(d) => field.onChange(d ? dayjs(d).format('YYYY-MM-DD') : null)}
                                                slotProps={{ textField: { fullWidth: true } }}
                                            />
                                        )}
                                    />
                                </Stack>
                            </LocalizationProvider>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={closeForm}>{getString('cancel')}</Button>
                            <Button type="submit" variant="contained" disabled={createMut.isPending}>
                                {createMut.isPending ? getString('creatingEllipsis') : getString('create')}
                            </Button>
                        </DialogActions>
                    </form>
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
                <DialogTitle>{getString('renameSession')}</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        fullWidth
                        label={getString('sessionName')}
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
                    <Button onClick={() => setRenameTarget(null)}>{getString('cancel')}</Button>
                    <Button
                        variant="contained"
                        disabled={!renameName.trim() || renameMut.isPending}
                        onClick={() => renameTarget && renameMut.mutate({ id: renameTarget.id, name: renameName.trim() })}
                    >
                        {renameMut.isPending ? getString('savingEllipsis') : getString('save')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete confirmation dialog */}
            <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
                <DialogTitle>{getString('deleteReviewSessionTitle')}</DialogTitle>
                <DialogContent>
                    <Typography variant="body2">
                        {getString('deleteSessionPrefix')} <strong>{deleteTarget?.name}</strong>{' '}
                        {deleteTarget && deleteTarget.employee_count > 0
                            ? getString('deleteSessionSuffixWithCount', { count: deleteTarget.employee_count })
                            : getString('deleteSessionSuffixNoCount')}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteTarget(null)}>{getString('cancel')}</Button>
                    <Button
                        variant="contained"
                        color="error"
                        startIcon={<DeleteIcon />}
                        disabled={deleteMut.isPending}
                        onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
                    >
                        {deleteMut.isPending ? getString('deletingEllipsis') : getString('deleteEverything')}
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
