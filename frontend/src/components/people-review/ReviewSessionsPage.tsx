import { useState, useMemo } from 'react';
import { PageBreadcrumbs } from '../ui/PageBreadcrumbs';
import { useForm, Controller } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import {
    Alert,
    Box,
    Button,
    Card,
    CardActionArea,
    CardContent,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Snackbar,
    Stack,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
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
import TuneIcon from '@mui/icons-material/Tune';
import EventIcon from '@mui/icons-material/Event';
import ApartmentIcon from '@mui/icons-material/Apartment';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import { SessionAnalyticsDialog } from './SessionAnalyticsDialog';
import { SessionParamsDialog } from './SessionParamsDialog';
import { ScopeSettings } from './ScopeSettings';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import AppShell from '../layout/AppShell.tsx';
import {
    fetchReviewSessionStatuses,
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
import { useBooleanSetting } from '../../hooks/useAppSetting';
import {
    fetchMainDepartmentCategories,
    fetchDepartmentsByCategory,
    type DepartmentCategoryOption,
    type DepartmentOption,
} from '../employees/employee_events/employeeEventApi';

function formatDate(val: string | null | undefined): string {
    if (!val) return '—';
    const [y, m, d] = val.split('-');
    if (!y || !m || !d) return val;
    return `${d}.${m}.${y}`;
}

// One-column period, like the planning grid: "01.01.2026 — 31.12.2026".
// Returns null when neither bound is set (so callers can omit it entirely).
function formatPeriod(start: string | null | undefined, end: string | null | undefined): string | null {
    if (!start && !end) return null;
    return `${formatDate(start)} — ${formatDate(end)}`;
}

async function renameSession(id: number, name: string): Promise<MutationResponse<ReviewSession>> {
    const res = await axiosInstance.patch<MutationResponse<ReviewSession>>(
        `${BASE_URL}/review_sessions/${id}`,
        { name },
    );
    return res.data;
}
import { useDataGridLocale } from '../../hooks/useDataGridLocale';
import { useAuthStore } from '../../store/authStore';
import { useReviewSessionsViewStore } from '../../store/reviewSessionsViewStore';
import cfl from '../../utils/helpers.ts';

const RS_QK = ['review_sessions'] as const;
const RSS_QK = ['review_session_statuses'] as const;

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

// Default roster order: pending → open → closed. Unknown statuses sort last.
const STATUS_ORDER: Record<string, number> = { pending: 0, open: 1, closed: 2 };
const statusRank = (s: string) => STATUS_ORDER[s] ?? 99;

const ALL_VALUE = '__all__';

export function ReviewSessionsPage() {
    const navigate = useNavigate();
    const qc = useQueryClient();
    const localeText = useDataGridLocale();
    const getString = useString();
    // Deleting a whole session (cascade) is developer-only.
    const isDeveloper = useAuthStore(
        (s) => (s.user?.groups ?? []).some((g) => g.toLowerCase() === 'dev'),
    );

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
    const [paramsSession, setParamsSession] = useState<ReviewSession | null>(null);
    const [renameTarget, setRenameTarget] = useState<ReviewSession | null>(null);
    const [renameName, setRenameName] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<ReviewSession | null>(null);
    const [statusFilter, setStatusFilter] = useState<string | null>(null);

    // Department filter feature flag
    const { enabled: deptFilterEnabled } =
        useBooleanSetting('review_session_filter_by_department');

    // Department selector state
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
    const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null);

    const { data: rows = [], isLoading, error } = useQuery({
        queryKey: RS_QK,
        queryFn: fetchReviewSessions,
        staleTime: 60 * 1000,
    });

    const { data: statuses = [] } = useQuery({
        queryKey: RSS_QK,
        queryFn: fetchReviewSessionStatuses,
        staleTime: 5 * 60 * 1000,
    });

    // Department data for the filter selector
    const { data: categories = [] } = useQuery<DepartmentCategoryOption[]>({
        queryKey: ['main-department-categories'],
        queryFn: fetchMainDepartmentCategories,
        enabled: deptFilterEnabled,
        staleTime: 10 * 60 * 1000,
    });

    const { data: topDepartments = [] } = useQuery<DepartmentOption[]>({
        queryKey: ['departments-by-category', selectedCategoryId],
        queryFn: () => fetchDepartmentsByCategory(selectedCategoryId!),
        enabled: deptFilterEnabled && selectedCategoryId != null,
        staleTime: 5 * 60 * 1000,
    });

    const closeForm = () => {
        setFormOpen(false);
        reset(EMPTY_FORM);
        setSelectedCategoryId(null);
        setSelectedDeptId(null);
    };

    const createMut = useMutation({
        mutationFn: createReviewSession,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: RS_QK });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            setFormOpen(false);
            reset(EMPTY_FORM);
            setSelectedCategoryId(null);
            setSelectedDeptId(null);
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

    const statusOptions = useMemo(
        () => statuses.map((s) => s.key),
        [statuses],
    );

    const statusLabelMap = useMemo(() => {
        const map = new Map<string, string>();
        for (const s of statuses) {
            const trKey = STATUS_LABEL_KEYS[s.key];
            map.set(s.key, trKey ? getString(trKey) : s.name);
        }
        return map;
    }, [statuses, getString]);

    // Filter by status, then default-sort pending → open → closed (stable within
    // a status). Feeds BOTH the grid and the cards, so the toggle is
    // presentation-only.
    const filteredRows = useMemo(() => {
        const base = statusFilter ? rows.filter((r) => r.status === statusFilter) : rows;
        return [...base].sort((a, b) => statusRank(a.status) - statusRank(b.status));
    }, [rows, statusFilter]);

    // Grid ⇄ cards view mode, persisted per user (localStorage-backed zustand).
    const view = useReviewSessionsViewStore((s) => s.view);
    const setView = useReviewSessionsViewStore((s) => s.setView);

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
            field: 'department_name',
            headerName: getString('department') || 'Department',
            flex: 0.6,
            minWidth: 140,
            valueFormatter: (value) => (value as string) || '—',
        },
        {
            field: 'period',
            headerName: getString('period') || 'Period',
            width: 200,
            // Sort by start date; display both bounds in one cell like the planning grid.
            valueGetter: (_value, row) => row.period_start ?? '',
            renderCell: (params) => formatPeriod(params.row.period_start, params.row.period_end) ?? '—',
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
            // Devs get two extra icons (frozen params + delete).
            width: isDeveloper ? 300 : 260,
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
                                            to: '/people_review/$sessionId',
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
                                    onClick={() => navigate({ to: '/people_review/$sessionId', params: { sessionId: String(row.id) } })}
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
                        {isDeveloper && (
                            <>
                                <Tooltip title={getString('sessionParamsTooltip')}>
                                    <IconButton
                                        size="small"
                                        onClick={() => setParamsSession(row)}
                                        sx={{ color: '#546E7A' }}
                                    >
                                        <TuneIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
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
                            </>
                        )}
                    </Stack>
                );
            },
        },
    ];

    return (
        <AppShell>
            <Box
                sx={{
                    p: { xs: 2, sm: 3 },
                    // Canonical width so breadcrumbs line up with every other page.
                    maxWidth: 1800,
                    mx: 'auto',
                    width: '100%',
                    // Fixed-height page so the grid scrolls internally (pinned headers)
                    // instead of the whole page scrolling under the 56px AppBar.
                    height: 'calc(100vh - 56px)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                }}
            >
                <PageBreadcrumbs
                    items={[
                        { to: '/', label: cfl(getString('home') || 'Home') },
                        { label: getString('peopleReviewSessions') },
                    ]}
                    sx={{mb: 2}}
                />

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    {statusOptions.length > 0 && (
                        <FormControl size="small" sx={{ minWidth: 160 }}>
                            <InputLabel>{getString('status')}</InputLabel>
                            <Select
                                label={getString('status')}
                                value={statusFilter ?? ALL_VALUE}
                                onChange={(e) =>
                                    setStatusFilter(e.target.value === ALL_VALUE ? null : e.target.value)
                                }
                            >
                                <MenuItem value={ALL_VALUE}>
                                    <em>{getString('all') || getString('allStatuses') || 'All'}</em>
                                </MenuItem>
                                {statusOptions.map((s) => (
                                    <MenuItem key={s} value={s}>
                                        {statusLabelMap.get(s) ?? s}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setFormOpen(true)}
                    >
                        {getString('newSession')}
                    </Button>
                    {/* Grid ⇄ cards toggle (persisted per user). */}
                    <ToggleButtonGroup
                        size="small"
                        exclusive
                        value={view}
                        onChange={(_, v) => v && setView(v)}
                    >
                        <ToggleButton value="grid"><ViewListIcon fontSize="small" /></ToggleButton>
                        <ToggleButton value="cards"><ViewModuleIcon fontSize="small" /></ToggleButton>
                    </ToggleButtonGroup>
                    {/* People-review scope switcher — same top-right spot as inside a session. */}
                    <Box sx={{ ml: 'auto' }}>
                        <ScopeSettings />
                    </Box>
                </Box>

                {isLoading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress />
                    </Box>
                )}

                {!isLoading && error && (
                    <Alert severity="error">{(error as Error).message}</Alert>
                )}

                {!isLoading && !error && view === 'grid' && (
                    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', flex: 1, minHeight: 0 }}>
                        <DataGrid
                            rows={filteredRows}
                            columns={columns}
                            paginationModel={paginationModel}
                            onPaginationModelChange={setPaginationModel}
                            pageSizeOptions={[5, 10, 25]}
                            disableRowSelectionOnClick
                            getRowId={(row) => row.id}
                            localeText={localeText}
                            hideFooterSelectedRowCount
                            onCellClick={(params) => {
                                // Whole row enters the session — except the action-icons cell.
                                if (params.field === 'actions') return;
                                void navigate({
                                    to: '/people_review/$sessionId',
                                    params: { sessionId: String(params.row.id) },
                                });
                            }}
                            sx={{
                                height: '100%',
                                '& .MuiDataGrid-row': { cursor: 'pointer' },
                                '& .MuiDataGrid-cell': { display: 'flex', alignItems: 'center', py: 1 },
                            }}
                        />
                    </Paper>
                )}

                {!isLoading && !error && view === 'cards' && (
                    // Card grid: SAME filtered+sorted rows as the DataGrid — the toggle
                    // is presentation-only. Shows status, name, department (if any),
                    // period (if any), employee count.
                    <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 2, pb: 2 }}>
                            {filteredRows.map((r) => {
                                const period = formatPeriod(r.period_start, r.period_end);
                                return (
                                    <Card key={r.id} variant="outlined">
                                        <CardActionArea
                                            onClick={() => navigate({
                                                to: '/people_review/$sessionId',
                                                params: { sessionId: String(r.id) },
                                            })}
                                        >
                                            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                                <Stack direction="row" alignItems="flex-start" spacing={1}>
                                                    <Typography fontSize={14} fontWeight={600} sx={{ flex: 1 }}>
                                                        {r.name}
                                                    </Typography>
                                                    <Chip
                                                        label={STATUS_LABEL_KEYS[r.status] ? getString(STATUS_LABEL_KEYS[r.status]) : r.status}
                                                        color={STATUS_COLORS[r.status] ?? 'default'}
                                                        size="small"
                                                        variant="outlined"
                                                    />
                                                </Stack>
                                                <Divider sx={{ my: 1 }} />
                                                <Stack spacing={0.75}>
                                                    {r.department_name && (
                                                        <Stack direction="row" spacing={0.75} alignItems="center">
                                                            <ApartmentIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
                                                            <Typography fontSize={12.5} color="text.secondary" noWrap>
                                                                {r.department_name}
                                                            </Typography>
                                                        </Stack>
                                                    )}
                                                    {period && (
                                                        <Stack direction="row" spacing={0.75} alignItems="center">
                                                            <EventIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
                                                            <Typography fontSize={12.5} color="text.secondary">
                                                                {period}
                                                            </Typography>
                                                        </Stack>
                                                    )}
                                                    <Stack direction="row" spacing={0.75} alignItems="center">
                                                        <PeopleIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
                                                        <Typography fontSize={12.5} color="text.secondary">
                                                            {getString('employees')}: {r.employee_count}
                                                        </Typography>
                                                    </Stack>
                                                </Stack>
                                            </CardContent>
                                        </CardActionArea>
                                    </Card>
                                );
                            })}
                        </Box>
                    </Box>
                )}

                {/* Create Dialog */}
                <Dialog open={formOpen} onClose={closeForm} maxWidth="sm" fullWidth>
                    <form onSubmit={handleSubmit((values) => {
                        const payload = { ...values };
                        if (deptFilterEnabled && selectedDeptId) {
                            payload.department_id = selectedDeptId;
                        }
                        createMut.mutate(payload);
                    })} noValidate>
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

                                    {/* Department filter (gated by app setting) */}
                                    {deptFilterEnabled && (
                                        <>
                                            <FormControl fullWidth>
                                                <InputLabel>
                                                    {getString('departmentCategory') || 'Department category'}
                                                </InputLabel>
                                                <Select<number | ''>
                                                    variant="outlined"
                                                    value={selectedCategoryId ?? ''}
                                                    label={getString('departmentCategory') || 'Department category'}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setSelectedCategoryId(val === '' ? null : Number(val));
                                                        setSelectedDeptId(null);
                                                    }}
                                                >
                                                    <MenuItem value="">
                                                        <em>{getString('none') || '(none)'}</em>
                                                    </MenuItem>
                                                    {categories.map((c) => (
                                                        <MenuItem key={c.id} value={c.id}>
                                                            {c.name}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                            {selectedCategoryId != null && topDepartments.length > 0 && (
                                                <FormControl fullWidth>
                                                    <InputLabel>
                                                        {getString('department') || 'Department'}
                                                    </InputLabel>
                                                    <Select<number | ''>
                                                        variant="outlined"
                                                        value={selectedDeptId ?? ''}
                                                        label={getString('department') || 'Department'}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setSelectedDeptId(val === '' ? null : Number(val));
                                                        }}
                                                    >
                                                        <MenuItem value="">
                                                            <em>{getString('all') || 'All departments'}</em>
                                                        </MenuItem>
                                                        {topDepartments.map((d) => (
                                                            <MenuItem key={d.id} value={d.id}>
                                                                {d.name}
                                                            </MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                            )}
                                        </>
                                    )}
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

            {/* Frozen session parameters dialog (dev-only) */}
            {paramsSession && (
                <SessionParamsDialog
                    sessionId={paramsSession.id}
                    sessionName={paramsSession.name}
                    open={!!paramsSession}
                    onClose={() => setParamsSession(null)}
                />
            )}
        </AppShell>
    );
}
