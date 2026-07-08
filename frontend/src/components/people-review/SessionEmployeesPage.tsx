import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import {
    Alert,
    Autocomplete,
    Box,
    Breadcrumbs,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    IconButton,
    LinearProgress,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Paper,
    Snackbar,
    Stack,
    Switch,
    TextField,
    Tooltip,
    Typography,
    useMediaQuery,
    useTheme as useMuiTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import LockIcon from '@mui/icons-material/Lock';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ReplayIcon from '@mui/icons-material/Replay';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import SlideshowIcon from '@mui/icons-material/Slideshow';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { Link } from '@tanstack/react-router';
import AppShell from '../layout/AppShell.tsx';
import {
    fetchSessionEmployees,
    fetchReviewSessions,
    fetchMyScopes,
    fetchSessionDepartments,
    reorderSessionEmployees,
    markReviewed,
    closeRSE,
    revertRSE,
    reopenRSE,
    addSessionEmployee,
    openTempoPresentation,
    downloadTempoPptx,
    type ReviewSessionEmployeeList,
} from './peopleReviewApi';
import { PEOPLE_REVIEW_MY_SCOPES_QK, SESSION_DEPARTMENTS_QK } from '../../utils/queryKeys';
import { useDataGridLocale } from '../../hooks/useDataGridLocale';
import { useTheme } from '../theme/ThemeContext';
import useString from '../../hooks/useString';
import { useClipboard } from '../../hooks/useClipboard';
import { ScopeSettings } from './ScopeSettings';
import { ReorderableList } from './ReorderableList';
import { EmployeeAutocomplete } from '../ui/EmployeeAutocomplete';
import EmployeeAvatar from '../ui/EmployeeAvatar';
import BusyBackdrop from '../ui/BusyBackdrop';

const RSE_STATUS_COLORS: Record<string, 'info' | 'warning' | 'success' | 'error'> = {
    open: 'info',
    reviewed: 'warning',
    closed: 'success',
};

// Estimated PPTX build time: a fixed share (data prep + deck save) plus a
// roughly-constant cost per employee slide. Drives the determinate progress
// bar — the real request just resolves whenever it resolves; the bar caps at
// 95% until then so it never lies about being done.
const PPTX_FIXED_MS = 2000;
const PPTX_PER_EMPLOYEE_MS = 8000; // measured: 33-employee session ≈ 4m20s end-to-end

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
    const muiTheme = useMuiTheme();
    const isXs = useMediaQuery(muiTheme.breakpoints.down('sm'));
    // Phone in landscape ("album"): wide enough to escape the xs breakpoint but so
    // short that a fixed-height page leaves zero room for grid rows. Treat any
    // short viewport the same as xs: page scroll + compact chrome.
    const isShort = useMediaQuery('(max-height: 500px)');
    const compact = isXs || isShort;
    const sid = Number(sessionId);

    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
    const { copyToClipboard } = useClipboard({
        onSuccess: (message) => setSnackbar({ open: true, message, severity: 'success' }),
        onError: (message) => setSnackbar({ open: true, message, severity: 'error' }),
    });
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });

    // Frontend-only employee filter: type a name/code to narrow the list, or pick
    // one employee from the dropdown. Store the id (not the object) so the derived
    // option survives query refetches; selecting by id sidesteps label-substring
    // mismatch from the "code — name" dash.
    const [selectedEmpId, setSelectedEmpId] = useState<number | null>(null);
    const [empInput, setEmpInput] = useState('');

    // Add-employee-to-session dialog.
    const [addOpen, setAddOpen] = useState(false);
    const [addEmpId, setAddEmpId] = useState<number | null>(null);

    // Compact-mode toolbar menu (groups Add / TEMPO / reorder behind one icon).
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

    // Presentation-queue reorder mode (oversight only). Local UI state — only the
    // order persists server-side; the toggle resets to OFF on reload.
    const [reorderMode, setReorderMode] = useState(false);

    // True while the session's TEMPO deck is being built server-side (can take a
    // while), so the button spins and a full-window overlay blocks other actions.
    const [presLoading, setPresLoading] = useState(false);
    const onPresentation = () => {
        // Open the tab NOW, synchronously, while we still hold the click's
        // user-activation — the build can take many seconds, and a window.open
        // after that fetch would be silently blocked by the browser. We redirect
        // this tab to the deck once it's ready (see openHtmlBlob).
        const win = window.open('', '_blank');
        if (!win) { onError(new Error(getString('popupBlocked'))); return; }
        const building = getString('tempoPresentationBuilding');
        win.document.write(
            `<!doctype html><meta charset="utf-8"><title>TEMPO</title>` +
            `<body style="margin:0;display:flex;align-items:center;justify-content:center;` +
            `height:100vh;font-family:'Segoe UI',Arial,sans-serif;color:#1b2a4a;background:#f7f6f2">` +
            `<div style="font-size:18px;font-weight:600">${building}</div></body>`,
        );
        setPresLoading(true);
        openTempoPresentation(sid, win)
            .catch(onError)
            .finally(() => setPresLoading(false));
    };

    // True while the session's PPTX deck is being built server-side; the browser
    // download starts the moment the bytes arrive. Progress is an ESTIMATE
    // (fixed + per-employee time — see the constants above): it climbs to 95%
    // on the predicted schedule and jumps to 100% when the response lands.
    const [pptxLoading, setPptxLoading] = useState(false);
    const [pptxProgress, setPptxProgress] = useState(0);
    const onPptx = () => {
        setPptxLoading(true);
        setPptxProgress(0);
        const estimatedMs = PPTX_FIXED_MS + rows.length * PPTX_PER_EMPLOYEE_MS;
        const startedAt = Date.now();
        const timer = window.setInterval(() => {
            setPptxProgress(Math.min(95, ((Date.now() - startedAt) / estimatedMs) * 100));
        }, 150);
        downloadTempoPptx(sid, `tempo_session_${sid}.pptx`)
            .catch(onError)
            .finally(() => {
                window.clearInterval(timer);
                setPptxProgress(100);
                // Let the full bar be seen for a beat before the button resets.
                window.setTimeout(() => {
                    setPptxLoading(false);
                    setPptxProgress(0);
                }, 400);
            });
    };

    const qk = ['session_employees', sid] as const;
    const sessQk = ['review_sessions'] as const;

    // Active people-review scope. Drives both the supervision "context complete"
    // gate (below) and the oversight-only reorder toggle (further down).
    const { data: scopes } = useQuery({
        queryKey: PEOPLE_REVIEW_MY_SCOPES_QK,
        queryFn: fetchMyScopes,
        staleTime: 60_000,
    });
    const activeRole = scopes?.roles.find(r => r.process_role_id === scopes.active.process_role_id);

    // Session-linked department ids — cross-check for supervision scope.
    const { data: sessionDeptIds } = useQuery({
        queryKey: SESSION_DEPARTMENTS_QK(sid),
        queryFn: () => fetchSessionDepartments(sid),
        staleTime: 120_000,
        enabled: !!sid,
    });

    // Supervision mode shows a roster only once BOTH the mode and a department are
    // chosen. While supervision is active but no department is picked, the context
    // is "incomplete": don't fetch the roster (would search/return just self), show
    // a placeholder instead.
    const contextIncomplete = activeRole?.link_target === 'department' && scopes?.active.department_id == null;

    const { data: rows = [], isLoading, isFetching, error } = useQuery({
        queryKey: qk,
        queryFn: () => fetchSessionEmployees(sid),
        staleTime: 30_000,
        // Wait for scopes to load before fetching: until then contextIncomplete is
        // false (no role yet), and on a supervision+no-dept reload that would flash
        // the self-only roster for one render before the gate engages.
        enabled: !!sid && !!scopes && !contextIncomplete,
    });

    // Need session info for status + name
    const { data: sessions = [] } = useQuery({ queryKey: sessQk, queryFn: fetchReviewSessions, staleTime: 60_000 });
    const session = sessions.find(s => s.id === sid);
    const sessionStatus = session?.status ?? 'open';
    const sessionName = session?.name ?? getString('sessionNumber', { id: sid });
    const isSessionClosed = sessionStatus === 'closed';

    // Reordering the presentation queue is an oversight-only action: the active
    // people-review role must target employees (link_target === 'employee').
    const isOversightActive = activeRole?.link_target === 'employee';
    const canReorder = isOversightActive && !isSessionClosed;

    // Count of employees still in "open" status — ALWAYS on the full roster, never
    // the filtered view. Drives the "employees still open" warning chip below.
    const openCount = rows.filter(r => r.status === 'open').length;

    const selectedEmp = rows.find(r => r.employee_id === selectedEmpId) ?? null;
    const filteredRows = useMemo(() => {
        if (selectedEmpId != null) return rows.filter(r => r.employee_id === selectedEmpId);
        const q = empInput.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter(r => `${r.employee_code} ${r.employee_name}`.toLowerCase().includes(q));
    }, [rows, selectedEmpId, empInput]);

    const onError = (err: Error) => setSnackbar({ open: true, message: err.message, severity: 'error' });

    // A status change here must ALSO refresh the per-employee detail page. Its
    // query (['rse_detail', sid, eid]) has a 30s staleTime, so without this the
    // detail page serves a stale status when you navigate into it. Prefix-match
    // invalidates every employee's detail in this session (eid is the 3rd key).
    const onStatusChangeSuccess = async (res: { detail: string }) => {
        await Promise.all([
            qc.invalidateQueries({ queryKey: qk }),
            qc.invalidateQueries({ queryKey: ['rse_detail', sid] }),
        ]);
        setSnackbar({ open: true, message: res.detail, severity: 'success' });
    };

    const reviewedMut = useMutation({
        mutationFn: markReviewed,
        onSuccess: onStatusChangeSuccess,
        onError,
    });

    const closeMut = useMutation({
        mutationFn: closeRSE,
        onSuccess: onStatusChangeSuccess,
        onError,
    });

    const revertMut = useMutation({
        mutationFn: revertRSE,
        onSuccess: onStatusChangeSuccess,
        onError,
    });

    const reopenMut = useMutation({
        mutationFn: reopenRSE,
        onSuccess: onStatusChangeSuccess,
        onError,
    });

    const reorderMut = useMutation({
        mutationFn: (orderedIds: number[]) => reorderSessionEmployees(sid, orderedIds),
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: qk });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
        },
        onError,
    });

    const addMut = useMutation({
        mutationFn: () => addSessionEmployee(sid, addEmpId as number),
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: qk });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            setAddOpen(false);
            setAddEmpId(null);
        },
        onError,
    });

    const columns: GridColDef<ReviewSessionEmployeeList>[] = [
        {
            field: 'photo',
            headerName: '',
            width: 52,
            sortable: false,
            filterable: false,
            renderCell: (params) => (
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        height: '100%',
                        '&:hover': { transform: 'scale(1.7)' },
                        transition: 'transform 0.2s ease',
                    }}
                >
                    <EmployeeAvatar
                        employeeId={params.row.employee_id}
                        name={params.row.employee_name}
                        scope="peopleReview"
                        size={36}
                    />
                </Box>
            ),
        },
        {
            field: 'employee_code',
            headerName: getString('code'),
            width: 130,
            renderCell: (params) => (
                <Stack direction="row" alignItems="center" spacing={0.25} height="100%">
                    <Typography fontSize={13}>{params.row.employee_code}</Typography>
                    <Tooltip title={getString('copyCode')}>
                        <IconButton
                            size="small"
                            onClick={(e) => { e.stopPropagation(); void copyToClipboard(params.row.employee_code); }}
                            sx={{ p: 0.25, color: t.textMuted }}
                        >
                            <ContentCopyIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                    </Tooltip>
                </Stack>
            ),
        },
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
                            onClick={() => navigate({ to: '/people_review/$sessionId/employee/$employeeId', params: { sessionId: String(sid), employeeId: String(row.employee_id) } })}
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
            <BusyBackdrop
                open={presLoading || (isFetching && !isLoading)}
                label={presLoading ? getString('tempoPresentationBuilding') : (getString('loading') || 'Loading\u2026')}
            />
            <Box
                sx={{
                    p: { xs: 1.5, sm: 3 },
                    px: { xs: 1.5, sm: 4, md: 6 },
                    maxWidth: '100%',
                    // On phones (xs) and short viewports (phone landscape): let the
                    // page scroll naturally — fixed-height leaves too little room for
                    // the DataGrid to render rows.
                    // Otherwise: fixed-height so the DataGrid scrolls internally with
                    // pinned headers instead of the whole page scrolling.
                    ...(compact
                        ? { minHeight: '100vh' }
                        : {
                              height: 'calc(100vh - 56px)',
                              '@supports (height: 100dvh)': { height: 'calc(100dvh - 56px)' },
                              overflow: 'hidden',
                          }),
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <Breadcrumbs
                    separator={<NavigateNextIcon sx={{ fontSize: compact ? 13 : 20 }} />}
                    sx={{ mb: compact ? 0.5 : 3, '& .MuiTypography-root': { fontSize: compact ? 12 : undefined } }}
                >
                    <Link to="/people_review" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <Typography variant="body2" color="text.secondary">{getString('peopleReview')}</Typography>
                    </Link>
                    <Typography variant="body2" color="text.primary" fontWeight={600}>
                        {sessionName}
                    </Typography>
                </Breadcrumbs>

                {/* Session header */}
                <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" mb={compact ? 0.75 : 2} flexWrap="wrap" gap={compact ? 0.75 : 1.5}>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Typography variant="h6" fontWeight={700} color={t.text} fontSize={compact ? '0.95rem' : undefined}>{sessionName}</Typography>
                        <Chip
                            label={getString(STATUS_LABEL_KEYS[sessionStatus] ?? sessionStatus)}
                            size="small"
                            color={sessionStatus === 'open' ? 'success' : sessionStatus === 'closed' ? 'error' : 'default'}
                            variant="outlined"
                        />
                        {session?.department_name && (
                            <Chip
                                label={session.department_name}
                                size="small"
                                color="secondary"
                                variant="outlined"
                            />
                        )}
                        {isSessionClosed && (
                            <Chip icon={<VisibilityIcon sx={{ fontSize: 13 }} />} label={getString('viewOnly')} size="small" variant="outlined" />
                        )}
                    </Stack>

                    {/* People-review scope switcher (mode + department) */}
                    <ScopeSettings sessionDepartmentIds={sessionDeptIds} sessionDepartmentName={session?.department_name} />

                    {/* Session is closed from the sessions grid's action column, not here. */}
                </Stack>

                {isSessionClosed && (
                    <Alert severity="info" icon={<VisibilityIcon />} sx={{ mb: { xs: 1, sm: 2 }, borderRadius: '10px' }}>
                        {getString('sessionClosedViewOnly')}
                    </Alert>
                )}

                {/* Supervision mode on, but no department chosen yet: no roster, prompt to pick one. */}
                {contextIncomplete && (
                    <Alert severity="info" icon={<VisibilityIcon />} sx={{ mb: { xs: 1, sm: 2 }, borderRadius: '10px' }}>
                        {getString('selectDepartmentToSeeRoster')}
                    </Alert>
                )}

                {!contextIncomplete && isLoading && <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}
                {!contextIncomplete && !isLoading && error && <Alert severity="error">{(error as Error).message}</Alert>}

                {!contextIncomplete && !isLoading && !error && (
                    <>
                        <Box sx={{ mb: compact ? 0.5 : 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: compact ? 0.75 : 1.5, flexWrap: 'wrap' }}>
                            {compact ? (
                                /* Compact (phone portrait OR landscape): group Add /
                                   TEMPO / reorder behind one hamburger icon so the
                                   toolbar doesn't eat the grid's vertical space. */
                                <>
                                    <IconButton
                                        size="small"
                                        onClick={(e) => setMenuAnchor(e.currentTarget)}
                                        sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px' }}
                                    >
                                        <MenuIcon fontSize="small" />
                                    </IconButton>
                                    <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
                                        {!isSessionClosed && (
                                            <MenuItem onClick={() => { setMenuAnchor(null); setAddOpen(true); }}>
                                                <ListItemIcon><PersonAddAlt1Icon fontSize="small" /></ListItemIcon>
                                                <ListItemText>{getString('addEmployee')}</ListItemText>
                                            </MenuItem>
                                        )}
                                        {rows.length > 0 && (
                                            <MenuItem
                                                disabled={presLoading}
                                                onClick={() => { setMenuAnchor(null); onPresentation(); }}
                                            >
                                                <ListItemIcon>
                                                    {presLoading ? <CircularProgress size={16} /> : <SlideshowIcon fontSize="small" />}
                                                </ListItemIcon>
                                                <ListItemText>
                                                    {presLoading ? getString('tempoPresentationBuilding') : getString('tempoPresentation')}
                                                </ListItemText>
                                            </MenuItem>
                                        )}
                                        {rows.length > 0 && (
                                            <MenuItem
                                                disabled={pptxLoading}
                                                onClick={() => { setMenuAnchor(null); onPptx(); }}
                                            >
                                                <ListItemIcon>
                                                    {pptxLoading ? <CircularProgress size={16} /> : <FileDownloadIcon fontSize="small" />}
                                                </ListItemIcon>
                                                <ListItemText>
                                                    {pptxLoading
                                                        ? `${getString('tempoPptxBuilding')} ${Math.round(pptxProgress)}%`
                                                        : getString('tempoPptx')}
                                                </ListItemText>
                                            </MenuItem>
                                        )}
                                        {canReorder && (
                                            <MenuItem onClick={() => setReorderMode(v => !v)}>
                                                <ListItemIcon>
                                                    <Switch size="small" checked={reorderMode} sx={{ pointerEvents: 'none' }} />
                                                </ListItemIcon>
                                                <ListItemText>{getString('reorderQueue')}</ListItemText>
                                            </MenuItem>
                                        )}
                                    </Menu>
                                </>
                            ) : (
                                <>
                                    {!isSessionClosed ? (
                                        <Button
                                            variant="contained" size="small"
                                            startIcon={<PersonAddAlt1Icon />}
                                            onClick={() => setAddOpen(true)}
                                            sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                                        >
                                            {getString('addEmployee')}
                                        </Button>
                                    ) : <span />}
                                    {/* Presentation: open all employees (in queue order) as one
                                        HTML deck with ◀ ▶ navigation, in a new tab. */}
                                    {rows.length > 0 && (
                                        <Button
                                            variant="outlined" size="small"
                                            disabled={presLoading}
                                            startIcon={presLoading ? <CircularProgress size={16} color="inherit" /> : <SlideshowIcon />}
                                            onClick={onPresentation}
                                            sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                                        >
                                            {presLoading ? getString('tempoPresentationBuilding') : getString('tempoPresentation')}
                                        </Button>
                                    )}
                                    {/* PPTX: download the same deck as a PowerPoint file, built
                                        server-side — estimated progress bar while building,
                                        download starts on arrival. */}
                                    {rows.length > 0 && (
                                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                            <Button
                                                variant="outlined" size="small"
                                                disabled={pptxLoading}
                                                startIcon={pptxLoading ? <CircularProgress size={16} color="inherit" /> : <FileDownloadIcon />}
                                                onClick={onPptx}
                                                sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                                            >
                                                {pptxLoading
                                                    ? `${getString('tempoPptxBuilding')} ${Math.round(pptxProgress)}%`
                                                    : getString('tempoPptx')}
                                            </Button>
                                            {pptxLoading && (
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={pptxProgress}
                                                    sx={{ borderRadius: '2px', mt: '2px' }}
                                                />
                                            )}
                                        </Box>
                                    )}
                                    {/* Oversight-only: toggle drag/arrow reordering of the presentation queue. */}
                                    {canReorder && (
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    size="small"
                                                    checked={reorderMode}
                                                    onChange={(_, v) => setReorderMode(v)}
                                                />
                                            }
                                            label={getString('reorderQueue')}
                                            sx={{ ml: 0, mr: 0, '& .MuiFormControlLabel-label': { fontSize: 13, fontWeight: 600 } }}
                                        />
                                    )}
                                </>
                            )}
                            {/* Compact warning in the toolbar row so it never pushes the table down. */}
                            {openCount > 0 && sessionStatus === 'open' && (
                                <Tooltip title={getString('employeesStillOpenWarning', { count: openCount })}>
                                    <Chip
                                        color="warning"
                                        variant="outlined"
                                        size="small"
                                        icon={<WarningAmberRoundedIcon sx={{ fontSize: 16 }} />}
                                        label={getString('employeesStillOpenShort', { count: openCount })}
                                    />
                                </Tooltip>
                            )}
                            <Autocomplete<ReviewSessionEmployeeList>
                                size="small"
                                sx={{ width: { xs: '100%', sm: 320 } }}
                                options={rows}
                                value={selectedEmp}
                                onChange={(_, opt) => {
                                    setSelectedEmpId(opt?.employee_id ?? null);
                                    setPaginationModel(p => ({ ...p, page: 0 }));
                                }}
                                inputValue={empInput}
                                onInputChange={(_, val) => {
                                    setEmpInput(val);
                                    setPaginationModel(p => ({ ...p, page: 0 }));
                                }}
                                getOptionLabel={(r) => `${r.employee_code} — ${r.employee_name}`}
                                isOptionEqualToValue={(o, v) => o.employee_id === v.employee_id}
                                noOptionsText={getString('noOptions')}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        variant="outlined"
                                        label={getString('filterByEmployee')}
                                        placeholder={getString('search')}
                                    />
                                )}
                            />
                        </Box>
                        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                        {reorderMode && canReorder ? (
                            // Full unpaginated roster in queue order; drag/arrows reassign 10,20,30…
                            <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                                <ReorderableList<ReviewSessionEmployeeList>
                                    rows={rows}
                                    getRowId={r => r.id}
                                    getString={getString}
                                    onReorder={ids => reorderMut.mutate(ids)}
                                    renderRow={r => (
                                        <Stack direction="row" alignItems="center" spacing={1.5}>
                                            <Typography fontSize={13} fontWeight={600} color="text.secondary" sx={{ minWidth: 64 }}>
                                                {r.employee_code}
                                            </Typography>
                                            <Typography fontSize={13} sx={{ flex: 1 }}>{r.employee_name}</Typography>
                                            <Chip
                                                label={getString(STATUS_LABEL_KEYS[r.status] ?? r.status)}
                                                color={RSE_STATUS_COLORS[r.status] ?? 'default'}
                                                size="small"
                                                variant="outlined"
                                            />
                                        </Stack>
                                    )}
                                />
                            </Box>
                        ) : (
                            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', ...(compact ? {} : { flex: 1, minHeight: 0 }) }}>
                                <DataGrid
                                rows={filteredRows} columns={columns}
                                paginationModel={paginationModel}
                                onPaginationModelChange={setPaginationModel}
                                pageSizeOptions={[10, 25, 50]}
                                disableRowSelectionOnClick
                                rowHeight={compact ? 48 : 64}
                                autoHeight={compact}
                                columnHeaderHeight={compact ? 40 : undefined}
                                getRowId={row => row.id}
                                localeText={localeText}
                                hideFooterSelectedRowCount
                                onCellClick={(params) => {
                                    // Whole row opens the employee review — except the actions cell.
                                    if (params.field === 'actions') return;
                                    void navigate({
                                        to: '/people_review/$sessionId/employee/$employeeId',
                                        params: { sessionId: String(sid), employeeId: String(params.row.employee_id) },
                                    });
                                }}
                                sx={{
                                    ...(compact ? {} : { height: '100%' }),
                                    '& .MuiDataGrid-row': { cursor: 'pointer' },
                                    '& .MuiDataGrid-cell': { display: 'flex', alignItems: 'center', py: compact ? 0.5 : 1 },
                                    ...(compact && {
                                        '& .MuiDataGrid-columnHeaderTitle': { fontSize: '0.75rem' },
                                        '& .MuiTablePagination-root': { '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': { fontSize: '0.75rem' } },
                                    }),
                                }}
                                />
                            </Paper>
                        )}
                        </Box>
                    </>
                )}

                <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="xs" fullWidth>
                    <DialogTitle>{getString('addEmployeeToSession')}</DialogTitle>
                    <DialogContent sx={{ pt: 1 }}>
                        <Box sx={{ mt: 1 }}>
                            <EmployeeAutocomplete
                                value={addEmpId}
                                onChange={setAddEmpId}
                                label={getString('employee')}
                                excludeIds={rows.map(r => r.employee_id)}
                                activeOnly
                            />
                        </Box>
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 2 }}>
                        <Button onClick={() => { setAddOpen(false); setAddEmpId(null); }}>
                            {getString('cancel')}
                        </Button>
                        <Button
                            variant="contained"
                            onClick={() => addMut.mutate()}
                            disabled={addEmpId == null || addMut.isPending}
                        >
                            {addMut.isPending ? getString('adding') : getString('add')}
                        </Button>
                    </DialogActions>
                </Dialog>

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