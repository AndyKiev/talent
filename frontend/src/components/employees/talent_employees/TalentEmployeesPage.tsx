// src/components/employees/talent_employees/TalentEmployeesPage.tsx
//
// Employees → Talent employees: every visible employee (same HRM scope as the
// Employees list) with their talents. One row per employee shows the MAIN
// talent (closest period; HRS result when interviewed, else HRM); the row
// expands to all talents. Filtering, sorting and paging run on the backend
// (/talent_audits/roster); all state lives in the URL.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Alert,
    Autocomplete,
    Badge,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Drawer,
    IconButton,
    Pagination,
    Snackbar,
    Stack,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import { DataGrid, type GridPaginationModel, type GridSortModel } from '@mui/x-data-grid';
import FilterListIcon from '@mui/icons-material/FilterList';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import { useNavigate, useSearch } from '@tanstack/react-router';
import type { TalentEmployeesSearch } from '../../../routes/employees/talent_employees';
import AppShell from '../../layout/AppShell';
import { PageBreadcrumbs } from '../../ui/PageBreadcrumbs';
import { SelectScopeDepartment } from '../SelectScopeDepartment';
import { fetchPriorityDepartment } from '../employeeApi';
import {
    createTalentAudit,
    deleteTalentAuditInterview,
    deleteTalentAuditJob,
} from '../talent_audit/talentAuditApi';
import { TalentAuditJobDialog } from '../talent_audit/TalentAuditJobDialog';
import { TalentAuditInterviewDialog } from '../talent_audit/TalentAuditInterviewDialog';
import { TalentAuditJobStatusDialog } from '../talent_audit/TalentAuditJobStatusDialog';
import {
    fetchTalentRoster,
    fetchTalentRosterOptions,
    type RosterOption,
    type RosterRow,
    type RosterTalent,
} from './talentEmployeesApi';
import { HAS_TALENT_FILTERS, HasTalentFilter, hasTalentLabel, hasTalentParam } from './hasTalentFilter';
import { SORT_FIELD_BY_COLUMN, useTalentEmployeeColumns } from './useTalentEmployeeColumns';
import { TalentEmployeeCard } from './TalentEmployeeCard';
import type { TalentRowHandlers } from './talentRowHandlers';
import {
    HRM_SCOPE_PRIORITY_QK,
    TALENT_AUDIT_ROSTER_OPTIONS_QK,
    TALENT_AUDIT_ROSTER_QK,
} from '../../../utils/queryKeys';
import useString from '../../../hooks/useString';
import { useEffectiveBooleanSetting } from '../../../hooks/useAppSetting';
import { useDataGridStyles } from '../../../hooks/useDataGridStyles';
import { useDataGridLocale } from '../../../hooks/useDataGridLocale';
import { centeredGridCellsSx } from '../../../utils/dataGridSx';
import { useTalentEmployeesViewStore } from '../../../store/talentEmployeesViewStore';
import cfl from '../../../utils/helpers.ts';

const PAGE_SIZES = [25, 50, 100];
const DEFAULT_PAGE_SIZE = 25;
// talent_audits.status_id for a new audit — same default as the Talent audit tab.
const NEW_AUDIT_STATUS_ID = 1;

type EmployeeOption = { id: number; code: string; name: string };
const empLabel = (e: EmployeeOption) => `${e.code} — ${e.name}`;

interface DeleteTarget {
    type: 'job' | 'interview';
    id: number;
    label: string;
}

export function TalentEmployeesPage() {
    const getString = useString();
    const qc = useQueryClient();
    const dataGridSx = useDataGridStyles();
    const localeText = useDataGridLocale();
    const navigate = useNavigate();
    const muiTheme = useTheme();
    const isCompact = useMediaQuery(muiTheme.breakpoints.down('lg'));
    const { enabled: photosEnabled } = useEffectiveBooleanSetting('employee_photos_employees_menu');

    // ── URL state ─────────────────────────────────────────────────────────────
    const search = useSearch({ from: '/employees/talent_employees' });
    // Picking a filter PUSHES a history entry (Back undoes it); typing replaces.
    // Any filter change returns to the first page.
    const setSearch = useCallback(
        (patch: Partial<TalentEmployeesSearch>, replace = false) =>
            navigate({
                to: '/employees/talent_employees',
                search: { ...search, page: undefined, ...patch },
                replace,
            }),
        [navigate, search],
    );

    const selectedDeptId = search.dept ?? null;
    const hasTalent = search.talent ?? HasTalentFilter.Yes;
    const page = search.page ?? 0;
    const pageSize = search.size && PAGE_SIZES.includes(search.size) ? search.size : DEFAULT_PAGE_SIZE;

    // ── Default department = the user's priority HRM scope (as /employees) ───
    const needsDefault = search.dept == null && !search.all;
    const { data: priority, isFetched: priorityFetched } = useQuery({
        queryKey: HRM_SCOPE_PRIORITY_QK,
        queryFn: fetchPriorityDepartment,
        enabled: needsDefault,
        staleTime: 5 * 60 * 1000,
    });
    const priorityDeptId = priority?.department_id ?? null;
    useEffect(() => {
        if (needsDefault && priorityDeptId != null) {
            void navigate({
                to: '/employees/talent_employees',
                search: { ...search, dept: priorityDeptId },
                replace: true,
            });
        }
    }, [needsDefault, priorityDeptId, navigate, search]);
    const listReady = !needsDefault || (priorityFetched && priorityDeptId == null);

    // ── Data ──────────────────────────────────────────────────────────────────
    const { data: options } = useQuery({
        queryKey: TALENT_AUDIT_ROSTER_OPTIONS_QK(selectedDeptId),
        queryFn: () => fetchTalentRosterOptions(selectedDeptId),
        enabled: listReady,
        staleTime: 2 * 60 * 1000,
    });

    const rosterParams = {
        page,
        page_size: pageSize,
        department_id: search.dept,
        subdepartment_id: search.subdept,
        job_id: search.job,
        status_id: search.status,
        employee_id: search.emp,
        q: search.emp == null ? search.q : undefined,
        has_talent: hasTalentParam(hasTalent),
        talent_status_id: search.tstatus,
        talent_period_id: search.tperiod,
        sort_field: search.sort,
        sort_desc: search.desc,
    };
    const { data: roster, isFetching, error } = useQuery({
        queryKey: [...TALENT_AUDIT_ROSTER_QK, rosterParams],
        queryFn: () => fetchTalentRoster(rosterParams),
        enabled: listReady,
        placeholderData: keepPreviousData,
    });
    const rows = roster?.items ?? [];
    const total = roster?.total ?? 0;

    // ── Row expansion (accordion of all talents) ─────────────────────────────
    const [expandedIds, setExpandedIds] = useState<ReadonlySet<number>>(new Set());
    const toggleExpanded = useCallback((id: number) => {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    // ── Dialog state ──────────────────────────────────────────────────────────
    const [addJobAuditId, setAddJobAuditId] = useState<number | null>(null);
    const [interviewAuditId, setInterviewAuditId] = useState<number | null>(null);
    const [statusTarget, setStatusTarget] = useState<{
        auditJobId: number;
        statusId: number;
        jobName: string;
    } | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error',
    });
    const notify = useCallback(
        (message: string, severity: 'success' | 'error' = 'success') =>
            setSnackbar({ open: true, message, severity }),
        [],
    );

    const refreshRoster = useCallback(
        () => qc.invalidateQueries({ queryKey: TALENT_AUDIT_ROSTER_QK }),
        [qc],
    );

    // ── Mutations ─────────────────────────────────────────────────────────────
    const createAuditMutation = useMutation({
        mutationFn: (employeeId: number) =>
            createTalentAudit({ employee_id: employeeId, status_id: NEW_AUDIT_STATUS_ID }),
        onSuccess: async (res) => {
            await refreshRoster();
            notify(res.detail);
        },
        onError: () => notify(getString('createFailed'), 'error'),
    });

    const deleteMutation = useMutation({
        mutationFn: (target: DeleteTarget) =>
            target.type === 'job'
                ? deleteTalentAuditJob(target.id)
                : deleteTalentAuditInterview(target.id),
        onSuccess: async () => {
            await refreshRoster();
            notify(getString('deleteSuccess'));
            setDeleteTarget(null);
        },
        onError: () => {
            notify(getString('deleteFailed'), 'error');
            setDeleteTarget(null);
        },
    });

    // ── Handlers (stable, so the memoized columns do not rebuild) ────────────
    const createAudit = createAuditMutation.mutate;
    const handlers: TalentRowHandlers = useMemo(
        () => ({
            openAudit: (row: RosterRow) =>
                void navigate({
                    to: '/employees/$employeeId/talent_audit',
                    params: { employeeId: String(row.employee_id) },
                }),
            createAudit: (row: RosterRow) => createAudit(row.employee_id),
            addJob: (row: RosterRow) => setAddJobAuditId(row.talent_audit_id),
            addInterview: (row: RosterRow) => setInterviewAuditId(row.talent_audit_id),
            changeStatus: (_row: RosterRow, t: RosterTalent) =>
                setStatusTarget({
                    auditJobId: t.talent_audit_job_id,
                    statusId: t.job_status_id,
                    jobName: t.job_name,
                }),
            deleteTalent: (_row: RosterRow, t: RosterTalent) =>
                setDeleteTarget(
                    t.interview_id != null
                        ? { type: 'interview', id: t.interview_id, label: t.job_name }
                        : { type: 'job', id: t.talent_audit_job_id, label: t.job_name },
                ),
        }),
        [navigate, createAudit],
    );

    const openEmployee = useCallback(
        (row: RosterRow) =>
            void navigate({
                to: '/employees/$employeeId',
                params: { employeeId: String(row.employee_id) },
            }),
        [navigate],
    );

    const columns = useTalentEmployeeColumns({
        getString,
        photosEnabled,
        expandedIds,
        onToggle: toggleExpanded,
        handlers,
    });

    // ── Server-side paging / sorting ↔ URL ───────────────────────────────────
    const paginationModel: GridPaginationModel = { page, pageSize };
    const onPaginationModelChange = (m: GridPaginationModel) =>
        navigate({
            to: '/employees/talent_employees',
            search: {
                ...search,
                page: m.pageSize !== pageSize || m.page === 0 ? undefined : m.page,
                size: m.pageSize === DEFAULT_PAGE_SIZE ? undefined : m.pageSize,
            },
        });
    const sortColumn = Object.entries(SORT_FIELD_BY_COLUMN).find(([, f]) => f === search.sort)?.[0];
    const sortModel: GridSortModel = sortColumn
        ? [{ field: sortColumn, sort: search.desc ? 'desc' : 'asc' }]
        : [];
    const onSortModelChange = (m: GridSortModel) => {
        const item = m[0];
        setSearch({
            sort: item ? SORT_FIELD_BY_COLUMN[item.field] : undefined,
            desc: item?.sort === 'desc' ? true : undefined,
        });
    };

    // ── Toolbar ───────────────────────────────────────────────────────────────
    const employeeOptions = options?.employees ?? [];
    const selectedEmp = employeeOptions.find((e) => e.id === search.emp) ?? null;
    const activeFilterCount = [
        search.dept,
        search.subdept,
        search.job,
        search.status,
        search.tstatus,
        search.tperiod,
        search.talent,
    ].filter((v) => v != null).length;

    const employeeSearch = (
        <Autocomplete<EmployeeOption>
            size="small"
            sx={{ width: isCompact ? undefined : 260, flex: isCompact ? 1 : undefined, minWidth: 160 }}
            options={employeeOptions}
            value={selectedEmp}
            onChange={(_, opt) => setSearch({ emp: opt?.id ?? undefined, q: undefined })}
            inputValue={selectedEmp ? empLabel(selectedEmp) : (search.q ?? '')}
            onInputChange={(_, val, reason) => {
                if (reason !== 'input') return;
                setSearch({ q: val.trim() === '' ? undefined : val }, true);
            }}
            getOptionLabel={empLabel}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            noOptionsText={getString('noOptions')}
            renderInput={(params) => (
                <TextField
                    {...params}
                    variant="outlined"
                    label={cfl(getString('filterByEmployee'))}
                    placeholder={getString('search')}
                />
            )}
        />
    );

    // One searchable id-valued filter (clearing ✕ = all).
    const idFilter = (
        labelKey: string,
        opts: RosterOption[],
        value: number | undefined,
        onChange: (id: number | undefined) => void,
        inDrawer: boolean,
        minWidth: number,
        translate = false,
    ) => (
        <Autocomplete<RosterOption>
            size="small"
            sx={inDrawer ? { width: '100%' } : { minWidth }}
            options={opts}
            value={opts.find((o) => o.id === value) ?? null}
            onChange={(_, o) => onChange(o?.id)}
            getOptionLabel={(o) => (translate ? cfl(getString(o.name)) : o.name)}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            noOptionsText={getString('noOptions')}
            renderInput={(params) => (
                <TextField
                    {...params}
                    variant="outlined"
                    label={cfl(getString(labelKey))}
                    placeholder={getString('search')}
                />
            )}
        />
    );

    const filterSelects = (inDrawer: boolean) => (
        <>
            <SelectScopeDepartment
                value={selectedDeptId}
                onChange={(id) =>
                    setSearch(
                        // The other option lists are rebuilt from the new scope,
                        // so their picks would turn invisible — drop them.
                        {
                            ...(id == null ? { dept: undefined, all: true } : { dept: id, all: undefined }),
                            subdept: undefined,
                            job: undefined,
                            status: undefined,
                            emp: undefined,
                        },
                    )
                }
                alwaysShow
            />
            {idFilter('department', options?.departments ?? [], search.subdept,
                (id) => setSearch({ subdept: id }), inDrawer, 200)}
            {idFilter('job', options?.jobs ?? [], search.job, (id) => setSearch({ job: id }), inDrawer, 180)}
            {idFilter('employeeStatus', options?.statuses ?? [], search.status,
                (id) => setSearch({ status: id }), inDrawer, 150, true)}
            <Autocomplete<HasTalentFilter, false, true>
                size="small"
                sx={inDrawer ? { width: '100%' } : { minWidth: 130 }}
                options={HAS_TALENT_FILTERS}
                value={hasTalent}
                disableClearable
                onChange={(_, v) =>
                    setSearch({ talent: v === HasTalentFilter.Yes ? undefined : v })
                }
                getOptionLabel={(v) => cfl(hasTalentLabel(v, getString))}
                renderInput={(params) => (
                    <TextField {...params} variant="outlined" label={cfl(getString('hasTalent'))} />
                )}
            />
            {idFilter('talentStatus', options?.talent_statuses ?? [], search.tstatus,
                (id) => setSearch({ tstatus: id }), inDrawer, 130)}
            {idFilter('talentPeriod', options?.talent_periods ?? [], search.tperiod,
                (id) => setSearch({ tperiod: id }), inDrawer, 130)}
        </>
    );

    const view = useTalentEmployeesViewStore((s) => s.view);
    const setView = useTalentEmployeesViewStore((s) => s.setView);
    const viewToggle = (
        <ToggleButtonGroup size="small" exclusive value={view} onChange={(_, v) => v && setView(v)}>
            <ToggleButton value="grid"><ViewListIcon fontSize="small" /></ToggleButton>
            <ToggleButton value="cards"><ViewModuleIcon fontSize="small" /></ToggleButton>
        </ToggleButtonGroup>
    );

    const isDeleting = deleteMutation.isPending;

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <AppShell>
            <Box
                sx={{
                    p: { xs: 2, sm: 3 },
                    maxWidth: 1800,
                    mx: 'auto',
                    height: 'calc(100vh - 56px)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                }}
            >
                <PageBreadcrumbs
                    items={[
                        { to: '/', label: cfl(getString('home')) },
                        { to: '/employees', label: cfl(getString('employees')) },
                        { label: cfl(getString('talentEmployees')) },
                    ]}
                />

                {isCompact ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        {employeeSearch}
                        <Tooltip title={cfl(getString('filters'))}>
                            <IconButton
                                onClick={() => setFiltersOpen(true)}
                                sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px' }}
                            >
                                <Badge badgeContent={activeFilterCount} color="primary">
                                    <FilterListIcon />
                                </Badge>
                            </IconButton>
                        </Tooltip>
                        {viewToggle}
                    </Box>
                ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
                        {employeeSearch}
                        {filterSelects(false)}
                        <Box sx={{ flex: 1 }} />
                        {viewToggle}
                    </Box>
                )}

                <Drawer anchor="right" open={filtersOpen} onClose={() => setFiltersOpen(false)}>
                    <Box sx={{ width: 300, p: 2 }}>
                        <Typography fontWeight={600} sx={{ mb: 2 }}>
                            {cfl(getString('filters'))}
                        </Typography>
                        <Stack spacing={2}>{filterSelects(true)}</Stack>
                    </Box>
                </Drawer>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {(error as Error).message}
                    </Alert>
                )}

                {view === 'grid' ? (
                    <Box sx={{ flex: 1, minHeight: 0 }}>
                        <DataGrid
                            rows={rows}
                            columns={columns}
                            getRowId={(r) => r.employee_id}
                            loading={isFetching || !listReady}
                            paginationMode="server"
                            sortingMode="server"
                            rowCount={total}
                            paginationModel={paginationModel}
                            onPaginationModelChange={onPaginationModelChange}
                            pageSizeOptions={PAGE_SIZES}
                            sortModel={sortModel}
                            onSortModelChange={onSortModelChange}
                            getRowHeight={({ id }) => (expandedIds.has(Number(id)) ? 'auto' : null)}
                            disableRowSelectionOnClick
                            onCellClick={(params) => {
                                // The name/code/department/job cells open the employee card;
                                // talent cells hold their own buttons.
                                if (['code', 'name', 'main_department_name', 'job_name', 'photo'].includes(params.field)) {
                                    openEmployee(params.row);
                                }
                            }}
                            sx={[
                                ...(Array.isArray(dataGridSx) ? dataGridSx : [dataGridSx]),
                                centeredGridCellsSx,
                                { height: '100%' },
                            ]}
                            localeText={localeText}
                        />
                    </Box>
                ) : (
                    <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                        {isFetching && rows.length === 0 ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                                <CircularProgress />
                            </Box>
                        ) : (
                            <Box
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                                    gap: 2,
                                    pb: 2,
                                    alignItems: 'start',
                                }}
                            >
                                {rows.map((r) => (
                                    <TalentEmployeeCard key={r.employee_id} row={r} handlers={handlers} onOpen={openEmployee} />
                                ))}
                            </Box>
                        )}
                        {total > pageSize && (
                            <Box sx={{ display: 'flex', justifyContent: 'center', pb: 2 }}>
                                <Pagination
                                    count={Math.ceil(total / pageSize)}
                                    page={page + 1}
                                    onChange={(_, p) => onPaginationModelChange({ page: p - 1, pageSize })}
                                />
                            </Box>
                        )}
                    </Box>
                )}
            </Box>

            {/* Talent dialogs — reused from the Talent audit tab; each one
                invalidates the roster prefix so the list refreshes. */}
            {addJobAuditId != null && (
                <TalentAuditJobDialog
                    open
                    talentAuditId={addJobAuditId}
                    auditJobsQK={TALENT_AUDIT_ROSTER_QK}
                    onClose={() => setAddJobAuditId(null)}
                    onSuccess={(msg) => notify(msg)}
                />
            )}
            {interviewAuditId != null && (
                <TalentAuditInterviewDialog
                    open
                    talentAuditId={interviewAuditId}
                    interviewsQK={TALENT_AUDIT_ROSTER_QK}
                    auditJobsQK={TALENT_AUDIT_ROSTER_QK}
                    onClose={() => setInterviewAuditId(null)}
                    onSuccess={(msg) => notify(msg)}
                    onError={(msg) => notify(msg, 'error')}
                />
            )}
            <TalentAuditJobStatusDialog
                open={!!statusTarget}
                auditJobId={statusTarget?.auditJobId ?? null}
                currentStatusId={statusTarget?.statusId ?? null}
                jobName={statusTarget?.jobName}
                auditJobsQK={TALENT_AUDIT_ROSTER_QK}
                onClose={() => setStatusTarget(null)}
                onSuccess={(msg) => notify(msg)}
                onError={(msg) => notify(msg, 'error')}
            />

            <Dialog open={!!deleteTarget} onClose={() => !isDeleting && setDeleteTarget(null)} maxWidth="xs" fullWidth>
                <DialogTitle>
                    {getString(deleteTarget?.type === 'interview' ? 'confirmDeleteInterview' : 'confirmDeleteJobAssessment')}
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary">
                        {getString(
                            deleteTarget?.type === 'interview'
                                ? 'confirmDeleteInterviewMessage'
                                : 'confirmDeleteJobAssessmentMessage',
                        )}
                    </Typography>
                    {deleteTarget && (
                        <Typography variant="body2" fontWeight={600} sx={{ mt: 1 }}>
                            {deleteTarget.label}
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
                        {getString('cancel')}
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
                        disabled={isDeleting}
                    >
                        {isDeleting ? <CircularProgress size={18} /> : getString('delete')}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={5000}
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
        </AppShell>
    );
}
