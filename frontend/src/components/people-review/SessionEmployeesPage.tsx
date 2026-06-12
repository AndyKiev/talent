import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import {
    Alert,
    Box,
    Breadcrumbs,
    Button,
    Chip,
    CircularProgress,
    Paper,
    Snackbar,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import CheckIcon from '@mui/icons-material/Check';
import LockIcon from '@mui/icons-material/Lock';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ReplayIcon from '@mui/icons-material/Replay';
import StopIcon from '@mui/icons-material/Stop';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { Link } from '@tanstack/react-router';
import AppShell from '../layout/AppShell.tsx';
import {
    fetchSessionEmployees,
    fetchReviewSessions,
    markReviewed,
    closeRSE,
    revertRSE,
    reopenRSE,
    closeReviewSession,
    type ReviewSessionEmployeeList,
} from './peopleReviewApi';
import { useDataGridLocale } from '../../hooks/useDataGridLocale';
import { useTheme } from '../theme/ThemeContext';
import useString from '../../hooks/useString';

const RSE_STATUS_COLORS: Record<string, 'info' | 'warning' | 'success' | 'error'> = {
    open: 'info',
    reviewed: 'warning',
    closed: 'success',
};

// status value → translation key (session: pending/open/closed; employee: open/reviewed/closed)
const STATUS_LABEL_KEYS: Record<string, string> = {
    pending: 'statusPending',
    open: 'statusOpen',
    reviewed: 'statusReviewed',
    closed: 'statusClosed',
};

export function SessionEmployeesPage() {
    const { sessionId } = useParams({ strict: false }) as { sessionId: string };
    const navigate = useNavigate();
    const qc = useQueryClient();
    const localeText = useDataGridLocale();
    const { t } = useTheme();
    const getString = useString();
    const sid = Number(sessionId);

    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });

    const qk = ['session_employees', sid] as const;
    const sessQk = ['review_sessions'] as const;

    const { data: rows = [], isLoading, error } = useQuery({
        queryKey: qk,
        queryFn: () => fetchSessionEmployees(sid),
        staleTime: 30_000,
        enabled: !!sid,
    });

    // Need session info for status + name
    const { data: sessions = [] } = useQuery({ queryKey: sessQk, queryFn: fetchReviewSessions, staleTime: 60_000 });
    const session = sessions.find(s => s.id === sid);
    const sessionStatus = session?.status ?? 'open';
    const sessionName = session?.name ?? getString('sessionNumber', { id: sid });
    const isSessionClosed = sessionStatus === 'closed';

    // Close-session eligibility: no employee in "open" status
    const openCount = rows.filter(r => r.status === 'open').length;
    const canCloseSession = openCount === 0 && rows.length > 0 && sessionStatus === 'open';

    const onError = (err: Error) => setSnackbar({ open: true, message: err.message, severity: 'error' });

    const reviewedMut = useMutation({
        mutationFn: markReviewed,
        onSuccess: async (res) => { await qc.invalidateQueries({ queryKey: qk }); setSnackbar({ open: true, message: res.detail, severity: 'success' }); },
        onError,
    });

    const closeMut = useMutation({
        mutationFn: closeRSE,
        onSuccess: async (res) => { await qc.invalidateQueries({ queryKey: qk }); setSnackbar({ open: true, message: res.detail, severity: 'success' }); },
        onError,
    });

    const revertMut = useMutation({
        mutationFn: revertRSE,
        onSuccess: async (res) => { await qc.invalidateQueries({ queryKey: qk }); setSnackbar({ open: true, message: res.detail, severity: 'success' }); },
        onError,
    });

    const reopenMut = useMutation({
        mutationFn: reopenRSE,
        onSuccess: async (res) => { await qc.invalidateQueries({ queryKey: qk }); setSnackbar({ open: true, message: res.detail, severity: 'success' }); },
        onError,
    });

    const closeSessionMut = useMutation({
        mutationFn: closeReviewSession,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: sessQk });
            await qc.invalidateQueries({ queryKey: qk });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
        },
        onError,
    });

    const columns: GridColDef<ReviewSessionEmployeeList>[] = [
        { field: 'employee_code', headerName: getString('code'), width: 100 },
        { field: 'employee_name', headerName: getString('employee'), flex: 1, minWidth: 180 },
        {
            field: 'status',
            headerName: getString('status'),
            width: 110,
            renderCell: (params) => (
                <Chip label={getString(STATUS_LABEL_KEYS[params.row.status] ?? params.row.status)} color={RSE_STATUS_COLORS[params.row.status] ?? 'default'} size="small" variant="outlined" />
            ),
        },
        {
            field: 'progress',
            headerName: getString('progress'),
            width: 210,
            sortable: false,
            renderCell: (params) => {
                const { scored_count = 0, facts_count = 0, total_dimensions = 0 } = params.row;
                const scorePct = total_dimensions > 0 ? (scored_count / total_dimensions) * 100 : 0;
                const factsPct = total_dimensions > 0 ? (facts_count / total_dimensions) * 100 : 0;
                const scoreFull = scored_count === total_dimensions && total_dimensions > 0;
                const factsFull = facts_count === total_dimensions && total_dimensions > 0;
                const scoreColor = scoreFull ? '#2E7D32' : '#1565C0';
                const factsColor = factsFull ? '#EF6C00' : '#FB8C00';
                return (
                    <Stack spacing={0.6} justifyContent="center" sx={{ height: '100%', width: '100%', py: 0.5 }}>
                        <Box>
                            <Typography fontSize={10.5} fontWeight={600} color={scoreColor}>
                                {getString('scoredProgress', { count: scored_count, total: total_dimensions })}
                            </Typography>
                            <Box sx={{ height: 5, borderRadius: 3, bgcolor: `${scoreColor}22`, width: '100%' }}>
                                <Box sx={{ height: '100%', borderRadius: 3, width: `${scorePct}%`, bgcolor: scoreColor, transition: 'width 0.3s' }} />
                            </Box>
                        </Box>
                        <Box>
                            <Typography fontSize={10.5} fontWeight={600} color={factsColor}>
                                {getString('factsProgress', { count: facts_count, total: total_dimensions })}
                            </Typography>
                            <Box sx={{ height: 5, borderRadius: 3, bgcolor: `${factsColor}22`, width: '100%' }}>
                                <Box sx={{ height: '100%', borderRadius: 3, width: `${factsPct}%`, bgcolor: factsColor, transition: 'width 0.3s' }} />
                            </Box>
                        </Box>
                    </Stack>
                );
            },
        },
        {
            field: 'actions',
            headerName: getString('actions'),
            width: 340,
            sortable: false,
            renderCell: (params) => {
                const row = params.row;
                const allFilled = row.scored_count === row.total_dimensions && row.total_dimensions > 0;
                return (
                    <Stack direction="row" spacing={0.5} alignItems="center" height="100%">
                        <Button
                            size="small" variant="outlined" startIcon={<VisibilityIcon />}
                            onClick={() => navigate({ to: '/people-review/evaluation/$rseId', params: { rseId: String(row.id) } })}
                        >
                            {getString('view')}
                        </Button>

                        {row.status === 'open' && !isSessionClosed && (
                            <Tooltip title={allFilled ? getString('markAsReviewed') : getString('fillAllDimensions', { filled: row.scored_count, total: row.total_dimensions })} placement="top">
                                <span>
                                    <Button size="small" variant="contained" color="warning"
                                        startIcon={allFilled ? <CheckIcon /> : <LockIcon />}
                                        onClick={() => reviewedMut.mutate(row.id)}
                                        disabled={!allFilled || reviewedMut.isPending}>
                                        {getString('markReviewed')}
                                    </Button>
                                </span>
                            </Tooltip>
                        )}

                        {row.status === 'reviewed' && !isSessionClosed && (
                            <>
                                <Button size="small" variant="contained" color="success"
                                    startIcon={<LockIcon />}
                                    onClick={() => closeMut.mutate(row.id)}
                                    disabled={closeMut.isPending}>
                                    {getString('close')}
                                </Button>
                                <Tooltip title={getString('revertToOpen')}>
                                    <Button size="small" variant="outlined" startIcon={<ReplayIcon />}
                                        onClick={() => revertMut.mutate(row.id)}
                                        disabled={revertMut.isPending}
                                        sx={{ minWidth: 0, px: 1 }}>
                                        {getString('revert')}
                                    </Button>
                                </Tooltip>
                            </>
                        )}

                        {row.status === 'closed' && !isSessionClosed && (
                            <>
                                <Tooltip title={getString('revertToReviewed')}>
                                    <Button size="small" variant="outlined" color="warning" startIcon={<ReplayIcon />}
                                        onClick={() => revertMut.mutate(row.id)}
                                        disabled={revertMut.isPending}>
                                        {getString('revert')}
                                    </Button>
                                </Tooltip>
                                <Tooltip title={getString('setDirectlyToOpen')}>
                                    <Button size="small" variant="outlined" startIcon={<ReplayIcon />}
                                        onClick={() => reopenMut.mutate(row.id)}
                                        disabled={reopenMut.isPending}
                                        sx={{ minWidth: 0, px: 1 }}>
                                        {getString('setOpen')}
                                    </Button>
                                </Tooltip>
                            </>
                        )}
                    </Stack>
                );
            },
        },
    ];

    return (
        <AppShell>
            <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1300, mx: 'auto' }}>
                <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 3 }}>
                    <Link to="/people-review" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <Typography variant="body2" color="text.secondary">{getString('peopleReview')}</Typography>
                    </Link>
                    <Typography variant="body2" color="text.primary" fontWeight={600}>
                        {sessionName}
                    </Typography>
                </Breadcrumbs>

                {/* Session header */}
                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2} flexWrap="wrap" gap={1.5}>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Typography variant="h6" fontWeight={700} color={t.text}>{sessionName}</Typography>
                        <Chip
                            label={getString(STATUS_LABEL_KEYS[sessionStatus] ?? sessionStatus)}
                            size="small"
                            color={sessionStatus === 'open' ? 'success' : sessionStatus === 'closed' ? 'error' : 'default'}
                            variant="outlined"
                        />
                        {isSessionClosed && (
                            <Chip icon={<VisibilityIcon sx={{ fontSize: 13 }} />} label={getString('viewOnly')} size="small" variant="outlined" />
                        )}
                    </Stack>

                    {/* Close session button */}
                    {sessionStatus === 'open' && (
                        <Tooltip title={canCloseSession ? getString('closeThisSession') : getString('employeesStillOpenTip', { count: openCount })}>
                            <span>
                                <Button
                                    variant="contained" color="error" size="small"
                                    startIcon={canCloseSession ? <StopIcon /> : <LockIcon />}
                                    onClick={() => closeSessionMut.mutate(sid)}
                                    disabled={!canCloseSession || closeSessionMut.isPending}
                                    sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                                >
                                    {closeSessionMut.isPending ? getString('closing') : getString('closeSession')}
                                </Button>
                            </span>
                        </Tooltip>
                    )}
                </Stack>

                {isSessionClosed && (
                    <Alert severity="info" icon={<VisibilityIcon />} sx={{ mb: 2, borderRadius: '10px' }}>
                        {getString('sessionClosedViewOnly')}
                    </Alert>
                )}

                {openCount > 0 && sessionStatus === 'open' && (
                    <Alert severity="warning" sx={{ mb: 2, borderRadius: '10px' }}>
                        {getString('employeesStillOpenWarning', { count: openCount })}
                    </Alert>
                )}

                {isLoading && <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}
                {!isLoading && error && <Alert severity="error">{(error as Error).message}</Alert>}

                {!isLoading && !error && (
                    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                        <DataGrid
                            rows={rows} columns={columns}
                            paginationModel={paginationModel}
                            onPaginationModelChange={setPaginationModel}
                            pageSizeOptions={[10, 25, 50]}
                            disableRowSelectionOnClick
                            rowHeight={64}
                            getRowId={row => row.id}
                            localeText={localeText}
                            hideFooterSelectedRowCount
                            sx={{ '& .MuiDataGrid-cell': { display: 'flex', alignItems: 'center', py: 1 } }}
                        />
                    </Paper>
                )}

                <Snackbar open={snackbar.open} autoHideDuration={6000}
                    onClose={() => setSnackbar(p => ({ ...p, open: false }))}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                    <Alert severity={snackbar.severity} onClose={() => setSnackbar(p => ({ ...p, open: false }))} sx={{ width: '100%' }}>
                        {snackbar.message}
                    </Alert>
                </Snackbar>
            </Box>
        </AppShell>
    );
}
