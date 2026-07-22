// src/components/employees/EmployeesPage.tsx
import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Autocomplete,
    Badge,
    Box,
    Button,
    Alert,
    Card,
    CardActionArea,
    CardContent,
    Chip,
    CircularProgress,
    Drawer,
    Snackbar,
    Stack,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
    Breadcrumbs,
    Tooltip,
    IconButton,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import FilterListIcon from '@mui/icons-material/FilterList';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ApartmentIcon from '@mui/icons-material/Apartment';
import AssessmentIcon from '@mui/icons-material/Assessment';
import EventNoteIcon from '@mui/icons-material/EventNote';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import type { EmployeesSearch } from '../../routes/employees/index';
import AppShell from '../layout/AppShell';
import { fetchEmployees, fetchEmployeesByDepartment, type Employee } from './employeeApi';
import { useEmployeeColumns } from './useEmployeeColumns';
import { useEmployeeMutations, EMPLOYEES_QK } from './useEmployeeMutations';
import { SelectScopeDepartment } from './SelectScopeDepartment';
import { EmployeeCreateDialog } from './EmployeeCreateDialog';
import { EmployeeEditDialog } from './EmployeeEditDialog';
import { EmployeeDeleteDialog } from './EmployeeDeleteDialog';
import { EmployeeDepartmentsDrawer } from './EmployeeDepartmentsDrawer';
import useString from '../../hooks/useString';
import str from '../../strings/str';
import cfl from '../../utils/helpers.ts';
import { useClipboard } from '../../hooks/useClipboard';
import { useDataGridStyles } from '../../hooks/useDataGridStyles';
import { useDataGridLocale } from '../../hooks/useDataGridLocale';
import { useAuthStore } from '../../store/authStore';
import { useEmployeesViewStore } from '../../store/employeesViewStore';
import EmployeeAvatar from '../ui/EmployeeAvatar';

// Label of one option in the employee filter — also what the input shows while
// an employee is selected.
const empLabel = (e: Employee) => `${e.code} — ${e.name}`;

export function EmployeesPage() {
    const getString = useString({ str });
    const dataGridSx = useDataGridStyles();
    const localeText = useDataGridLocale();
    const navigate = useNavigate();
    const muiTheme = useTheme();
    // Below lg the filter selects don't all fit on one line alongside the search +
    // Add button — squeezing further would clip the Add button (the toolbar is a
    // no-wrap row inside an overflow:hidden box). So at lg they move into a Drawer
    // opened by the filter-lines icon, and the Add button collapses to an icon.
    const isCompact = useMediaQuery(muiTheme.breakpoints.down('lg'));

    // Dev/superadmin (bypass) users may force-cascade related records on delete.
    const isDev = useAuthStore(
        (s) => (s.user?.groups ?? []).some((g) => g.trim().toLowerCase() === 'dev'),
    );

    // ── Dialog / drawer state ─────────────────────────────────────────────────
    const [createOpen, setCreateOpen] = useState(false);
    const [employeeToEdit, setEmployeeToEdit] = useState<Employee | null>(null);
    const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
    const [employeeForDepts, setEmployeeForDepts] = useState<Employee | null>(null);

    // ── Filter state lives in the URL (?dept&subdept&job&status&emp&q) ────────
    // Every filter is a search param, so Back/Forward walk the filter history
    // (e.g. picking a department with no employees → Back returns to the full
    // list) and a reload/bookmark restores exactly the same view.
    const search = useSearch({ from: '/employees/' });
    // Picking a filter PUSHES a history entry — that is what makes Back undo it.
    // Free-text typing replaces instead, or history fills up per keystroke.
    const setSearch = (patch: Partial<EmployeesSearch>, replace = false) =>
        navigate({ to: '/employees', search: { ...search, ...patch }, replace });

    // Selected department in the filter Select (undefined = all visible to the user).
    const selectedDeptId = search.dept ?? null;
    const setSelectedDeptId = (id: number | null) => setSearch({ dept: id ?? undefined });

    // ── Client-side column filters (like SelectScopeDepartment, atop each column) ──
    const statusFilter = search.status ?? null;
    const setStatusFilter = (v: string | null) => setSearch({ status: v ?? undefined });
    const subdepartmentFilter = search.subdept ?? null;
    const setSubdepartmentFilter = (v: string | null) => setSearch({ subdept: v ?? undefined });
    const jobFilter = search.job ?? null;
    const setJobFilter = (v: string | null) => setSearch({ job: v ?? undefined });

    // Employee search (first control, like the people-review session filter):
    // type to narrow by code/name, or pick one employee by id from the dropdown.
    const selectedEmpId = search.emp ?? null;
    const empInput = search.q ?? '';

    // Mobile-only filters drawer.
    const [filtersOpen, setFiltersOpen] = useState(false);

    // Grid ⇄ cards view mode, persisted per user (localStorage-backed zustand).
    const view = useEmployeesViewStore((s) => s.view);
    const setView = useEmployeesViewStore((s) => s.setView);

    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error',
    });

    // ── Data ──────────────────────────────────────────────────────────────────
    const { data: employees = [], isLoading, error } = useQuery({
        queryKey: [...EMPLOYEES_QK, { departmentId: selectedDeptId }],
        queryFn: () =>
            selectedDeptId == null
                ? fetchEmployees()
                : fetchEmployeesByDepartment(selectedDeptId),
        staleTime: 2 * 60 * 1000,
    });

    // ── Derive unique filter options from the full (unfiltered) employee list ──
    // Status values need translation for display, but raw value for filtering.
    const statusLabelMap = useMemo(() => {
        const map = new Map<string, string>();
        for (const e of employees)
            if (e.status?.name) map.set(e.status.name, cfl(getString(e.status.name) || e.status.name));
        return map;
    }, [employees, getString]);
    const statusOptions = useMemo(
        () => [...new Set(employees.map((e) => e.status?.name).filter(Boolean))].sort() as string[],
        [employees],
    );
    const subdepartmentOptions = useMemo(() => {
        // Build a name → min category sort_order map from employee data so the
        // closest-department filter dropdown is sorted by department_category.sort_order.
        const orderMap = new Map<string, number>();
        for (const e of employees) {
            const d = e.main_department;
            if (!d) continue;
            const prev = orderMap.get(d.name);
            if (prev === undefined || d.department_category_sort_order < prev) {
                orderMap.set(d.name, d.department_category_sort_order);
            }
        }
        return [...new Set(employees.map((e) => e.main_department?.name).filter(Boolean) as string[])]
            .sort((a, b) => (orderMap.get(a) ?? 0) - (orderMap.get(b) ?? 0) || a.localeCompare(b));
    }, [employees]);
    const jobOptions = useMemo(
        () => [...new Set(employees.map((e) => e.job?.name).filter(Boolean))].sort() as string[],
        [employees],
    );

    // ── Client-side filtering ───────────────────────────────────────────────────
    const filteredEmployees = useMemo(() => {
        let result = employees;
        if (statusFilter)
            result = result.filter((e) => e.status?.name === statusFilter);
        if (subdepartmentFilter)
            result = result.filter(
                (e) => e.main_department?.name === subdepartmentFilter,
            );
        if (jobFilter) result = result.filter((e) => e.job?.name === jobFilter);
        if (selectedEmpId != null) {
            result = result.filter((e) => e.id === selectedEmpId);
        } else {
            const q = empInput.trim().toLowerCase();
            if (q) result = result.filter((e) => `${e.code} ${e.name}`.toLowerCase().includes(q));
        }
        return result;
    }, [employees, statusFilter, subdepartmentFilter, jobFilter, selectedEmpId, empInput]);

    const selectedEmp = employees.find((e) => e.id === selectedEmpId) ?? null;
    const activeFilterCount = [selectedDeptId, subdepartmentFilter, jobFilter, statusFilter]
        .filter((v) => v != null).length;

    // ── Mutations ─────────────────────────────────────────────────────────────
    const { createMutation, updateMutation, deleteMutation } = useEmployeeMutations({
        setSnackbar,
        onCreateSuccess: () => setCreateOpen(false),
        onUpdateSuccess: () => setEmployeeToEdit(null),
        onDeleteSuccess: () => setEmployeeToDelete(null),
        onDeleteError: () => setEmployeeToDelete(null),
    });

    // ── Clipboard ──────────────────────────────────────────────────────────────
    const { copyToClipboard } = useClipboard({
        onSuccess: (message) => setSnackbar({ open: true, message, severity: 'success' }),
        onError: (message) => setSnackbar({ open: true, message, severity: 'error' }),
    });

    // ── Action handlers ───────────────────────────────────────────────────────
    const handleEdit = useCallback((emp: Employee) => setEmployeeToEdit(emp), []);
    const handleDelete = useCallback((emp: Employee) => setEmployeeToDelete(emp), []);
    const handleManageDepts = useCallback((emp: Employee) => setEmployeeForDepts(emp), []);

    // ── Base columns (photo first, then code/name/...) + actions column ──────
    const baseColumns = useEmployeeColumns(copyToClipboard);

    // Memoized: a fresh actions column (new renderCell closure) every render
    // would make the DataGrid re-render all cells on any page state change.
    const actionsColumn: GridColDef<Employee> = useMemo(() => ({
        field: '_actions',
        headerName: '',
        width: 180,
        sortable: false,
        disableColumnMenu: true,
        renderCell: ({ row }) => (
            <Box sx={{ display: 'flex', gap: 0.25, alignItems: 'center', height: '100%' }}>
                <Tooltip title={cfl(getString('events') || 'Events')}>
                    <IconButton
                        size="small"
                        color="primary"
                        onClick={() => {
                            void navigate({
                                to: '/employees/$employeeId/events',
                                params: { employeeId: String(row.id) },
                            });
                        }}
                    >
                        <EventNoteIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
                <Tooltip title={cfl(getString('talentAudit') || 'Talent Audit')}>
                    <IconButton
                        size="small"
                        color="secondary"
                        onClick={() => {
                            void navigate({
                                to: '/employees/$employeeId/talent_audit',
                                params: { employeeId: String(row.id) },
                            });
                        }}
                    >
                        <AssessmentIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
                <Tooltip title={cfl(getString('manageDepartments') || 'Manage Departments')}>
                    <IconButton
                        size="small"
                        color="info"
                        onClick={() => handleManageDepts(row)}
                    >
                        <ApartmentIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
                <Tooltip title={cfl(getString('edit') || 'Edit')}>
                    <IconButton size="small" color="warning" onClick={() => handleEdit(row)}>
                        <EditIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
                <Tooltip title={cfl(getString('delete') || 'Delete')}>
                    <IconButton size="small" color="error" onClick={() => handleDelete(row)}>
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Box>
        ),
    }), [getString, navigate, handleManageDepts, handleEdit, handleDelete]);

    // Column order: photo → actions → code → name → email → ...
    // The photo column is absent when the photos feature is off, so detect it by
    // field rather than assuming index 0 (keeps the order correct either way).
    const columns = useMemo(() => {
        const photoColumn = baseColumns.find((c) => c.field === 'photo');
        const restColumns = baseColumns.filter((c) => c.field !== 'photo');
        return [...(photoColumn ? [photoColumn] : []), ...restColumns, actionsColumn];
    }, [baseColumns, actionsColumn]);

    // ── Toolbar pieces (shared between the desktop row and the mobile drawer) ──
    const employeeSearch = (
        <Autocomplete<Employee>
            size="small"
            sx={{ width: isCompact ? undefined : 280, flex: isCompact ? 1 : undefined, minWidth: 160 }}
            options={employees}
            value={selectedEmp}
            // Picking one employee replaces the free-text filter (and pushes a
            // history entry); the text is restored if you press Back.
            onChange={(_, opt) => setSearch({ emp: opt?.id ?? undefined, q: undefined })}
            // While an employee is picked the box shows that option's label; it
            // is never written to the URL, so only what you typed persists.
            inputValue={selectedEmp ? empLabel(selectedEmp) : empInput}
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
                    label={cfl(getString('filterByEmployee') || 'Filter by employee')}
                    placeholder={getString('search') || 'Search'}
                />
            )}
        />
    );

    // Every filter is a searchable Autocomplete (type to narrow the options);
    // clearing (✕) means "all". They filter the same rows both views consume.
    const filterSelects = (inDrawer: boolean) => (
        <>
            {/* Always rendered: picking a department with no employees must not
                hide the very control needed to pick another one. */}
            <SelectScopeDepartment value={selectedDeptId} onChange={setSelectedDeptId} alwaysShow />
            {subdepartmentOptions.length > 0 && (
                <Autocomplete<string>
                    size="small"
                    sx={inDrawer ? { width: '100%' } : { minWidth: 200 }}
                    options={subdepartmentOptions}
                    value={subdepartmentFilter}
                    onChange={(_, v) => setSubdepartmentFilter(v)}
                    noOptionsText={getString('noOptions')}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            variant="outlined"
                            label={cfl(getString('department') || 'Department')}
                            placeholder={getString('search') || 'Search'}
                        />
                    )}
                />
            )}
            {jobOptions.length > 0 && (
                <Autocomplete<string>
                    size="small"
                    sx={inDrawer ? { width: '100%' } : { minWidth: 180 }}
                    options={jobOptions}
                    value={jobFilter}
                    onChange={(_, v) => setJobFilter(v)}
                    noOptionsText={getString('noOptions')}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            variant="outlined"
                            label={cfl(getString('job') || 'Job')}
                            placeholder={getString('search') || 'Search'}
                        />
                    )}
                />
            )}
            {statusOptions.length > 0 && (
                <Autocomplete<string>
                    size="small"
                    sx={inDrawer ? { width: '100%' } : { minWidth: 160 }}
                    options={statusOptions}
                    value={statusFilter}
                    onChange={(_, v) => setStatusFilter(v)}
                    getOptionLabel={(s) => statusLabelMap.get(s) ?? s}
                    noOptionsText={getString('noOptions')}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            variant="outlined"
                            label={cfl(getString('employeeStatus') || 'Status')}
                            placeholder={getString('search') || 'Search'}
                        />
                    )}
                />
            )}
        </>
    );

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <AppShell>
            <Box
                sx={{
                    p: { xs: 2, sm: 3 },
                    maxWidth: 1800,
                    mx: 'auto',
                    // Fill the viewport below the 56px sticky AppBar and let the grid
                    // scroll internally (its column headers stay pinned) instead of the
                    // whole page scrolling under the header.
                    height: 'calc(100vh - 56px)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                }}
            >
                {/* Breadcrumbs */}
                <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 3 }}>
                    <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <Typography variant="body2" color="text.secondary">
                            {cfl(getString('home') || 'Home')}
                        </Typography>
                    </Link>
                    <Typography variant="body2" color="text.primary" fontWeight={600}>
                        {cfl(getString('employees') || 'Employees')}
                    </Typography>
                </Breadcrumbs>

                {/* Toolbar. Desktop (md+): search + filter selects + Add on one line.
                    Mobile/tablet: search + filter-lines icon (opens the drawer) + icon-only Add,
                    so the Add button is always visible and the selects never overflow. */}
                {isCompact ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        {employeeSearch}
                        <Tooltip title={cfl(getString('filters') || 'Filters')}>
                            <IconButton
                                onClick={() => setFiltersOpen(true)}
                                sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px' }}
                            >
                                <Badge badgeContent={activeFilterCount} color="primary">
                                    <FilterListIcon />
                                </Badge>
                            </IconButton>
                        </Tooltip>
                        <ToggleButtonGroup size="small" exclusive value={view} onChange={(_, v) => v && setView(v)}>
                            <ToggleButton value="grid"><ViewListIcon fontSize="small" /></ToggleButton>
                            <ToggleButton value="cards"><ViewModuleIcon fontSize="small" /></ToggleButton>
                        </ToggleButtonGroup>
                        <Tooltip title={cfl(getString('addEmployee') || 'Add Employee')}>
                            <Button
                                variant="contained"
                                onClick={() => setCreateOpen(true)}
                                sx={{ minWidth: 0, px: 1.5 }}
                            >
                                <AddIcon />
                            </Button>
                        </Tooltip>
                    </Box>
                ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        {employeeSearch}
                        {filterSelects(false)}
                        <Box sx={{ flex: 1 }} />
                        <ToggleButtonGroup size="small" exclusive value={view} onChange={(_, v) => v && setView(v)}>
                            <ToggleButton value="grid"><ViewListIcon fontSize="small" /></ToggleButton>
                            <ToggleButton value="cards"><ViewModuleIcon fontSize="small" /></ToggleButton>
                        </ToggleButtonGroup>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => setCreateOpen(true)}
                            sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                        >
                            {cfl(getString('addEmployee') || 'Add Employee')}
                        </Button>
                    </Box>
                )}

                {/* Mobile filters drawer */}
                <Drawer anchor="right" open={filtersOpen} onClose={() => setFiltersOpen(false)}>
                    <Box sx={{ width: 300, p: 2 }}>
                        <Typography fontWeight={600} sx={{ mb: 2 }}>
                            {cfl(getString('filters') || 'Filters')}
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
                            rows={filteredEmployees}
                            columns={columns}
                            loading={isLoading}
                            pageSizeOptions={[25, 50, 100]}
                            initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
                            disableRowSelectionOnClick
                            onCellClick={(params) => {
                                // Whole row opens the employee card — except the action-icons cell.
                                if (params.field === '_actions') return;
                                void navigate({
                                    to: '/employees/$employeeId',
                                    params: { employeeId: String(params.row.id) },
                                });
                            }}
                            sx={[...(Array.isArray(dataGridSx) ? dataGridSx : [dataGridSx]), { height: '100%' }]}
                            localeText={localeText}
                        />
                    </Box>
                ) : (
                    // Card grid: SAME filtered rows as the DataGrid — every toolbar
                    // filter applies identically; the toggle is presentation-only.
                    <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                        {isLoading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                                <CircularProgress />
                            </Box>
                        ) : (
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 2, pb: 2 }}>
                                {filteredEmployees.map((e) => {
                                    const statusName = e.status?.name ?? '';
                                    const statusColorMap: Record<string, 'warning' | 'success' | 'error' | 'default'> = {
                                        pending: 'warning',
                                        working: 'success',
                                        dismissed: 'error',
                                    };
                                    return (
                                        <Card key={e.id} variant="outlined">
                                            <CardActionArea
                                                onClick={() => {
                                                    void navigate({
                                                        to: '/employees/$employeeId',
                                                        params: { employeeId: String(e.id) },
                                                    });
                                                }}
                                            >
                                                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                                    <Stack direction="row" spacing={1.5} alignItems="center">
                                                        <EmployeeAvatar employeeId={e.id} name={e.name} scope="employeesMenu" size={40} />
                                                        <Box sx={{ minWidth: 0, flex: 1 }}>
                                                            <Typography fontSize={13} fontWeight={600} noWrap>
                                                                {e.name}
                                                            </Typography>
                                                            <Typography fontSize={11.5} color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                                                                {e.code}
                                                            </Typography>
                                                        </Box>
                                                        {statusName && (
                                                            <Chip
                                                                label={cfl(getString(statusName) || statusName)}
                                                                size="small"
                                                                color={statusColorMap[statusName] ?? 'default'}
                                                                variant="outlined"
                                                            />
                                                        )}
                                                    </Stack>
                                                    <Stack direction="row" spacing={0.5} mt={1.25} flexWrap="wrap" useFlexGap>
                                                        {e.main_department && (
                                                            <Chip label={e.main_department.name} size="small" color="success" variant="outlined" />
                                                        )}
                                                        {e.job && (
                                                            <Chip label={e.job.name} size="small" color="primary" variant="outlined" />
                                                        )}
                                                    </Stack>
                                                </CardContent>
                                            </CardActionArea>
                                        </Card>
                                    );
                                })}
                            </Box>
                        )}
                    </Box>
                )}
            </Box>

            {/* Dialogs */}
            <EmployeeCreateDialog
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                createMutation={createMutation}
            />
            <EmployeeEditDialog
                employee={employeeToEdit}
                onClose={() => setEmployeeToEdit(null)}
                updateMutation={updateMutation}
            />
            <EmployeeDeleteDialog
                employee={employeeToDelete}
                isPending={deleteMutation.isPending}
                isDev={isDev}
                onConfirm={(force) =>
                    employeeToDelete &&
                    deleteMutation.mutate({ id: employeeToDelete.id, force })
                }
                onCancel={() => setEmployeeToDelete(null)}
            />

            {/* Departments drawer */}
            <EmployeeDepartmentsDrawer
                employee={employeeForDepts}
                onClose={() => setEmployeeForDepts(null)}
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
        </AppShell>
    );
}