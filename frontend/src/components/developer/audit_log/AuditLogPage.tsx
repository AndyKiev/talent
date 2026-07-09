// src/components/developer/audit_log/AuditLogPage.tsx
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Box,
    Breadcrumbs,
    Chip,
    CircularProgress,
    Divider,
    Drawer,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import CloseIcon from '@mui/icons-material/Close';
import HistoryIcon from '@mui/icons-material/History';
import ArrowRightAltIcon from '@mui/icons-material/ArrowRightAlt';
import { Link } from '@tanstack/react-router';
import AppShell from '../../layout/AppShell';
import { PageContainer } from '../../layout/PageContainer';
import {
    fetchChangeSessions,
    fetchChangeSessionLogs,
    type ChangeSession,
    type ChangeSource,
    type ChangeRunStatus,
    type ChangeLog,
    type ChangeDiff,
} from './auditApi';
import type { GetStringFn } from '../../../types/getStringFn';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';
import cfl from '../../../utils/helpers.ts';
import { useDataGridStyles } from '../../../hooks/useDataGridStyles';
import { useDataGridLocale } from '../../../hooks/useDataGridLocale';

type ChipColor =
    | 'default'
    | 'primary'
    | 'secondary'
    | 'error'
    | 'info'
    | 'success'
    | 'warning';

const SOURCE_COLOR: Record<ChangeSource, ChipColor> = {
    manual: 'info',
    system: 'secondary',
};
const STATUS_COLOR: Record<ChangeRunStatus, ChipColor> = {
    running: 'warning',
    success: 'success',
    failed: 'error',
};
const ACTION_COLOR: Record<string, ChipColor> = {
    create: 'success',
    update: 'info',
    delete: 'error',
    apply: 'primary',
    status_change: 'secondary',
    revert: 'warning',
};

const ALL = '__all__';

const fmtDateTime = (s?: string | null): string =>
    s ? new Date(s).toLocaleString('uk-UA', { dateStyle: 'short', timeStyle: 'short' }) : '—';

const fmtVal = (v: unknown): string => {
    if (v === null || v === undefined) return '—';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
};

// Compact one-line summary for a run (prefers the sweep stats).
const summaryText = (summary: Record<string, unknown> | null): string => {
    if (!summary) return '';
    const preferred = ['checked', 'applied', 'failed'];
    const keys = preferred.filter((k) => k in summary);
    const use = keys.length ? keys : Object.keys(summary).slice(0, 4);
    return use.map((k) => `${k}: ${fmtVal(summary[k])}`).join('  ·  ');
};

// ── Field-level before/after block ───────────────────────────────────────────
function ChangesBlock({
    changes,
    getString,
}: {
    changes: ChangeDiff | null;
    getString: GetStringFn;
}) {
    if (!changes || Object.keys(changes).length === 0) {
        return (
            <Typography variant="caption" color="text.disabled">
                {cfl(getString('noChanges') || 'No field changes')}
            </Typography>
        );
    }
    return (
        <Stack spacing={0.25} sx={{ mt: 0.5 }}>
            {Object.entries(changes).map(([field, val]) => {
                const fieldLabel = getString(field);
                return (
                    <Box key={field} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary', minWidth: 92 }}>
                            {fieldLabel ? cfl(fieldLabel) : field}
                        </Typography>
                        <Chip size="small" variant="outlined" label={fmtVal(val?.old)} sx={{ height: 18 }} />
                        <ArrowRightAltIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                        <Chip size="small" variant="outlined" color="primary" label={fmtVal(val?.new)} sx={{ height: 18 }} />
                    </Box>
                );
            })}
        </Stack>
    );
}

// ── One log entry + its cascaded children (recursive) ────────────────────────
function LogNode({
    log,
    all,
    depth,
    getString,
}: {
    log: ChangeLog;
    all: ChangeLog[];
    depth: number;
    getString: GetStringFn;
}) {
    const children = all.filter((l) => l.parent_id === log.id);
    return (
        <Box
            sx={{
                pl: depth * 2,
                py: 0.75,
                borderLeft: depth > 0 ? '2px solid' : 'none',
                borderColor: 'divider',
                ml: depth > 0 ? 1 : 0,
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                    size="small"
                    label={cfl(getString(log.action) || log.action)}
                    color={ACTION_COLOR[log.action] ?? 'default'}
                />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {log.essence_key}
                </Typography>
                {log.entity_id != null && (
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.disabled' }}>
                        #{log.entity_id}
                    </Typography>
                )}
                {log.employee && (
                    <Chip
                        size="small"
                        variant="outlined"
                        sx={{ height: 18 }}
                        label={`${log.employee.name}${log.employee.code ? ' · ' + log.employee.code : ''}`}
                    />
                )}
            </Box>
            <ChangesBlock changes={log.changes} getString={getString} />
            {children.map((c) => (
                <LogNode key={c.id} log={c} all={all} depth={depth + 1} getString={getString} />
            ))}
        </Box>
    );
}

// ── Run detail drawer ────────────────────────────────────────────────────────
function RunDrawer({
    session,
    onClose,
    getString,
}: {
    session: ChangeSession | null;
    onClose: () => void;
    getString: GetStringFn;
}) {
    const open = !!session;
    const { data: logs = [], isLoading } = useQuery({
        queryKey: ['change-session-logs', session?.id],
        queryFn: () => fetchChangeSessionLogs(session!.id),
        enabled: open,
        staleTime: 60 * 1000,
    });
    const roots = useMemo(() => logs.filter((l) => l.parent_id == null), [logs]);

    const actor =
        session?.source === 'system'
            ? session?.task_name ?? '—'
            : session?.triggered_by?.name ?? (session?.triggered_by_user_id != null ? `#${session.triggered_by_user_id}` : '—');

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            PaperProps={{ sx: { width: { xs: '100%', sm: 540 }, p: 2 } }}
        >
            {session && (
                <>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                        <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1 }}>
                            {cfl(getString('runDetails') || 'Run details')} #{session.id}
                        </Typography>
                        <IconButton size="small" onClick={onClose}>
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Stack>

                    <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1 }}>
                        <Chip
                            size="small"
                            label={cfl(getString(session.source) || session.source)}
                            color={SOURCE_COLOR[session.source] ?? 'default'}
                        />
                        <Chip
                            size="small"
                            label={cfl(getString(session.status) || session.status)}
                            color={STATUS_COLOR[session.status] ?? 'default'}
                            variant="outlined"
                        />
                    </Stack>

                    <Stack spacing={0.25} sx={{ mb: 1.5 }}>
                        <Typography variant="caption" color="text.secondary">
                            {cfl(getString('triggeredBy') || 'Triggered by')}: <strong>{actor}</strong>
                        </Typography>
                        {session.employee && (
                            <Typography variant="caption" color="text.secondary">
                                {cfl(getString('employee') || 'Employee')}:{' '}
                                <strong>{session.employee.name}</strong>
                                {session.employee.code ? ` (${session.employee.code})` : ''}
                            </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary">
                            {cfl(getString('startedAt') || 'Started')}: {fmtDateTime(session.started_at)}
                            {'   ·   '}
                            {cfl(getString('finishedAt') || 'Finished')}: {fmtDateTime(session.finished_at)}
                        </Typography>
                        {summaryText(session.summary) && (
                            <Typography variant="caption" color="text.secondary">
                                {cfl(getString('summary') || 'Summary')}: {summaryText(session.summary)}
                            </Typography>
                        )}
                    </Stack>

                    <Divider sx={{ mb: 1 }} />
                    <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                        {cfl(getString('changes') || 'Changes')}
                    </Typography>

                    {isLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                            <CircularProgress size={22} />
                        </Box>
                    ) : roots.length === 0 ? (
                        <Typography variant="body2" color="text.disabled" sx={{ p: 1 }}>
                            {cfl(getString('noChanges') || 'No changes recorded for this run')}
                        </Typography>
                    ) : (
                        <Stack divider={<Divider flexItem />} spacing={0.5}>
                            {roots.map((r) => (
                                <LogNode key={r.id} log={r} all={logs} depth={0} getString={getString} />
                            ))}
                        </Stack>
                    )}
                </>
            )}
        </Drawer>
    );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export function AuditLogPage() {
    const getString = useString({ str });
    const dataGridSx = useDataGridStyles();
    const localeText = useDataGridLocale();

    const [source, setSource] = useState<ChangeSource | null>(null);
    const [status, setStatus] = useState<ChangeRunStatus | null>(null);
    const [empName, setEmpName] = useState('');
    const [empCode, setEmpCode] = useState('');
    const [selected, setSelected] = useState<ChangeSession | null>(null);

    const { data: sessions = [], isLoading } = useQuery({
        queryKey: ['change-sessions', { source, status }],
        queryFn: () => fetchChangeSessions({ source, status, limit: 500 }),
        staleTime: 60 * 1000,
    });

    // Filter by subject employee name and code separately (client-side over the
    // loaded runs). Bulk/system runs have no session-level employee — their
    // employees show per entry inside the drawer.
    const rows = useMemo(() => {
        const n = empName.trim().toLowerCase();
        const c = empCode.trim().toLowerCase();
        if (!n && !c) return sessions;
        return sessions.filter((s) => {
            const okName = !n || (s.employee?.name?.toLowerCase().includes(n) ?? false);
            const okCode = !c || (s.employee?.code?.toLowerCase().includes(c) ?? false);
            return okName && okCode;
        });
    }, [sessions, empName, empCode]);

    const columns: GridColDef<ChangeSession>[] = [
        {
            field: 'id',
            headerName: '#',
            width: 70,
            renderCell: ({ value }) => (
                <span style={{ fontFamily: 'monospace' }}>#{value as number}</span>
            ),
        },
        {
            field: 'started_at',
            headerName: cfl(getString('startedAt') || 'Started'),
            width: 150,
            renderCell: ({ value }) => fmtDateTime(value as string),
        },
        {
            field: 'source',
            headerName: cfl(getString('source') || 'Source'),
            width: 120,
            renderCell: ({ row }) => (
                <Chip
                    size="small"
                    label={cfl(getString(row.source) || row.source)}
                    color={SOURCE_COLOR[row.source] ?? 'default'}
                />
            ),
        },
        {
            field: 'status',
            headerName: cfl(getString('status') || 'Status'),
            width: 120,
            renderCell: ({ row }) => (
                <Chip
                    size="small"
                    variant="outlined"
                    label={cfl(getString(row.status) || row.status)}
                    color={STATUS_COLOR[row.status] ?? 'default'}
                />
            ),
        },
        {
            field: '_employee',
            headerName: cfl(getString('employee') || 'Employee'),
            flex: 1,
            minWidth: 200,
            sortable: false,
            valueGetter: (_v, row) =>
                row.employee ? `${row.employee.name} ${row.employee.code ?? ''}` : '—',
            renderCell: ({ row }) => {
                if (!row.employee) return <span style={{ color: '#bbb' }}>—</span>;
                return (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                        <Typography variant="body2">{row.employee.name}</Typography>
                        {row.employee.code && (
                            <Chip
                                size="small"
                                variant="outlined"
                                label={row.employee.code}
                                sx={{ fontFamily: 'monospace', height: 18 }}
                            />
                        )}
                    </Box>
                );
            },
        },
        {
            field: '_actor',
            headerName: cfl(getString('triggeredBy') || 'Triggered by'),
            flex: 1,
            minWidth: 180,
            sortable: false,
            valueGetter: (_v, row) =>
                row.source === 'system'
                    ? row.task_name ?? '—'
                    : row.triggered_by?.name ?? '—',
            renderCell: ({ row }) => {
                if (row.source === 'system') {
                    return (
                        <Tooltip title={row.task_name ?? ''}>
                            <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                {row.task_name ?? '—'}
                            </span>
                        </Tooltip>
                    );
                }
                return <span>{row.triggered_by?.name ?? '—'}</span>;
            },
        },
        {
            field: '_summary',
            headerName: cfl(getString('summary') || 'Summary'),
            flex: 1,
            minWidth: 200,
            sortable: false,
            valueGetter: (_v, row) => summaryText(row.summary),
            renderCell: ({ row }) => {
                const text = summaryText(row.summary);
                return text ? (
                    <Typography variant="caption" color="text.secondary">
                        {text}
                    </Typography>
                ) : (
                    <span style={{ color: '#bbb' }}>—</span>
                );
            },
        },
    ];

    return (
        <AppShell>
            <PageContainer>
                {/* Breadcrumbs */}
                <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 3 }}>
                    <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <Typography variant="body2" color="text.secondary">
                            {cfl(getString('home') || 'Home')}
                        </Typography>
                    </Link>
                    <Link to="/developer" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <Typography variant="body2" color="text.secondary">
                            {cfl(getString('devPanel') || 'Developer')}
                        </Typography>
                    </Link>
                    <Typography variant="body2" color="text.primary">
                        {cfl(getString('auditLog') || 'Audit log')}
                    </Typography>
                </Breadcrumbs>

                {/* Header + filters */}
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2, flexWrap: 'wrap' }}>
                    <HistoryIcon color="action" />
                    <Typography variant="h6" fontWeight={600}>
                        {cfl(getString('auditLog') || 'Audit log')}
                    </Typography>
                    <Box sx={{ flex: 1 }} />
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel>{cfl(getString('source') || 'Source')}</InputLabel>
                        <Select
                            label={cfl(getString('source') || 'Source')}
                            value={source ?? ALL}
                            onChange={(e) =>
                                setSource(e.target.value === ALL ? null : (e.target.value as ChangeSource))
                            }
                        >
                            <MenuItem value={ALL}>
                                <em>{getString('allSources') || 'All sources'}</em>
                            </MenuItem>
                            <MenuItem value="manual">{cfl(getString('manual') || 'Manual')}</MenuItem>
                            <MenuItem value="system">{cfl(getString('system') || 'System')}</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel>{cfl(getString('status') || 'Status')}</InputLabel>
                        <Select
                            label={cfl(getString('status') || 'Status')}
                            value={status ?? ALL}
                            onChange={(e) =>
                                setStatus(e.target.value === ALL ? null : (e.target.value as ChangeRunStatus))
                            }
                        >
                            <MenuItem value={ALL}>
                                <em>{getString('allStatuses') || 'All statuses'}</em>
                            </MenuItem>
                            <MenuItem value="running">{cfl(getString('running') || 'Running')}</MenuItem>
                            <MenuItem value="success">{cfl(getString('success') || 'Success')}</MenuItem>
                            <MenuItem value="failed">{cfl(getString('failed') || 'Failed')}</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        size="small"
                        label={cfl(getString('employeeName') || 'Name')}
                        value={empName}
                        onChange={(e) => setEmpName(e.target.value)}
                        sx={{ minWidth: 180 }}
                    />
                    <TextField
                        size="small"
                        label={cfl(getString('employeeCode') || 'Code')}
                        value={empCode}
                        onChange={(e) => setEmpCode(e.target.value)}
                        sx={{ minWidth: 140 }}
                    />
                </Stack>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {getString('auditLogDesc') ||
                        'Every change run: manual actions (with the user) and scheduled celery sweeps (with their stats). Open a run to see its before/after changes.'}
                </Typography>

                <Paper variant="outlined">
                    <DataGrid
                        rows={rows}
                        columns={columns}
                        loading={isLoading}
                        autoHeight
                        pageSizeOptions={[25, 50, 100]}
                        initialState={{
                            pagination: { paginationModel: { pageSize: 25 } },
                            sorting: { sortModel: [{ field: 'started_at', sort: 'desc' }] },
                        }}
                        disableRowSelectionOnClick
                        onRowClick={(params) => setSelected(params.row as ChangeSession)}
                        sx={{ ...dataGridSx, '& .MuiDataGrid-row': { cursor: 'pointer' } }}
                        localeText={localeText}
                    />
                </Paper>
            </PageContainer>

            <RunDrawer session={selected} onClose={() => setSelected(null)} getString={getString} />
        </AppShell>
    );
}
