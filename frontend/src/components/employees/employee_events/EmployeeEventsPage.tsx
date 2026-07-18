// src/components/employees/employee_events/EmployeeEventsPage.tsx
import { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Divider,
    IconButton,
    Paper,
    Snackbar,
    Stack,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EventNoteIcon from '@mui/icons-material/EventNote';
import DeleteIcon from '@mui/icons-material/Delete';
import UndoIcon from '@mui/icons-material/Undo';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import { useParams } from '@tanstack/react-router';
import {
    fetchDepartments,
    fetchEmployeeEvents,
    type EmployeeEventFlat,
    type EmployeeEventFull,
    type EmployeeEventCreate,
} from './employeeEventApi';
import { departmentMapById, departmentPathLabel } from '../../../utils/departmentPath';
import { employeeEventsQK, useEmployeeEventMutations } from './useEmployeeEventMutations';
import { EmployeeEventDeleteDialog } from './EmployeeEventDeleteDialog';
import { EmployeeEventRevertDialog } from './EmployeeEventRevertDialog';
import { EmployeeEventCreateDialog } from './EmployeeEventCreateDialog';
import { EmployeeEventDrawer } from './EmployeeEventDrawer';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';
import cfl from '../../../utils/helpers.ts';
import { formatToUkrDate } from '../../../utils/dateFormatter';
import { useDataGridStyles } from '../../../hooks/useDataGridStyles';
import { useDataGridLocale } from '../../../hooks/useDataGridLocale';
import { useEmployeeEventsViewStore } from '../../../store/employeeEventsViewStore';

import { eventStatusColor, revertTargetOf } from './employeeEventStatus';

export function EmployeeEventsPage() {
    const { employeeId: employeeIdStr } = useParams({
        from: '/employees/$employeeId/events/',
    });
    const employeeId = Number(employeeIdStr);
    const getString = useString({ str });
    const qc = useQueryClient();
    const dataGridSx = useDataGridStyles();
    const localeText = useDataGridLocale();

    const [createOpen, setCreateOpen] = useState(false);
    const [eventToDelete, setEventToDelete] = useState<EmployeeEventFlat | null>(null);
    const [eventToRevert, setEventToRevert] = useState<EmployeeEventFlat | null>(null);
    const [drawerEvent, setDrawerEvent] = useState<EmployeeEventFlat | null>(null);
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error',
    });

    // Grid ⇄ cards view mode, persisted per user (localStorage-backed zustand).
    const view = useEmployeeEventsViewStore((s) => s.view);
    const setView = useEmployeeEventsViewStore((s) => s.setView);

    // ── Events data ───────────────────────────────────────────────────────────
    const { data: events = [], isLoading, error } = useQuery({
        queryKey: employeeEventsQK(employeeId),
        queryFn: () => fetchEmployeeEvents(employeeId),
        staleTime: 2 * 60 * 1000,
    });

    // Departments flat (with parent_id) — resolves an event's target
    // department to "Root - Dept" (e.g. "Почайна - Комерція") in the grid.
    const { data: departmentsFlat = [] } = useQuery({
        queryKey: ['departments'],
        queryFn: fetchDepartments,
        staleTime: 5 * 60 * 1000,
    });
    const deptById = useMemo(() => departmentMapById(departmentsFlat), [departmentsFlat]);

    // ── Mutations ─────────────────────────────────────────────────────────────
    const { createMutation, deleteMutation, revertMutation } = useEmployeeEventMutations({
        employeeId,
        setSnackbar,
        onCreateSuccess: () => setCreateOpen(false),
        onDeleteSuccess: () => {
            setEventToDelete(null);
            // Deleting the latest event reprojects job + main department on the
            // employee server-side — refresh the views that show them.
            qc.invalidateQueries({ queryKey: ['employee'] });
            qc.invalidateQueries({ queryKey: ['employee_departments'] });
            qc.invalidateQueries({ queryKey: ['employees'] });
        },
        onRevertSuccess: () => {
            setEventToRevert(null);
            // applied -> ready un-applies the event (reprojects job + main dept
            // and restores talent statuses) — refresh the same views as delete.
            qc.invalidateQueries({ queryKey: ['employee'] });
            qc.invalidateQueries({ queryKey: ['employee_departments'] });
            qc.invalidateQueries({ queryKey: ['employees'] });
        },
    });

    // Only the latest event (by effective_date, then id) may be deleted —
    // deletion must unwind state from the most recent change backwards.
    const lastEvent = useMemo<EmployeeEventFlat | null>(
        () =>
            events.reduce<EmployeeEventFlat | null>((max, e) => {
                if (!max) return e;
                if (e.effective_date > max.effective_date) return e;
                if (e.effective_date === max.effective_date && e.id > max.id) return e;
                return max;
            }, null),
        [events],
    );

    // Cards mirror the grid's default sort (effective_date desc, then id desc).
    const sortedEvents = useMemo(
        () =>
            [...events].sort((a, b) =>
                b.effective_date.localeCompare(a.effective_date) || b.id - a.id,
            ),
        [events],
    );

    const handleDeleteClick = useCallback(
        (e: React.MouseEvent, event: EmployeeEventFlat) => {
            e.stopPropagation();
            setEventToDelete(event);
        },
        [],
    );

    const handleDeleteConfirm = () => {
        if (eventToDelete) deleteMutation.mutate(eventToDelete.id);
    };

    const handleRevertClick = useCallback(
        (e: React.MouseEvent, event: EmployeeEventFlat) => {
            e.stopPropagation();
            setEventToRevert(event);
        },
        [],
    );

    const handleRevertConfirm = () => {
        if (eventToRevert) revertMutation.mutate(eventToRevert.id);
    };

    const handleCreate = (payload: EmployeeEventCreate) => {
        createMutation.mutate(payload);
    };

    // ── Columns ───────────────────────────────────────────────────────────────
    // Memoized: rebuilding the array (new renderCell closures) on every render
    // makes the DataGrid re-render all cells whenever anything on the page
    // changes (snackbar, dialog open, mutation pending...).
    const columns: GridColDef<EmployeeEventFull>[] = useMemo(() => [
        {
            field: 'effective_date',
            headerName: cfl(getString('effectiveDate') || 'Effective date'),
            width: 140,
            renderCell: ({ value }) => formatToUkrDate(value as string),
        },
        {
            field: 'event_type',
            headerName: cfl(getString('eventType') || 'Event type'),
            flex: 1,
            minWidth: 160,
            valueGetter: (_v, row) => row.event_type?.name ?? `#${row.event_type_id}`,
        },
        {
            // The job this event sets (JOB_CHANGE row), when affected.
            field: '_new_job',
            headerName: cfl(getString('eventNewJob') || 'New job'),
            flex: 1,
            minWidth: 150,
            valueGetter: (_v, row) =>
                row.changes?.find((c) => c.direction_type?.code === 'JOB_CHANGE')
                    ?.new_job?.name ?? '',
            renderCell: ({ value }) =>
                value ? (
                    <span>{value as string}</span>
                ) : (
                    <Box component="span" sx={{ color: 'text.secondary' }}>—</Box>
                ),
        },
        {
            // The main department this event sets (MAIN_DEPT_CHANGE row), shown
            // together with its root instance: "Почайна - Комерція".
            field: '_new_department',
            headerName: cfl(getString('eventNewDepartment') || 'New department'),
            flex: 1,
            minWidth: 180,
            valueGetter: (_v, row) => {
                const change = row.changes?.find(
                    (c) => c.direction_type?.code === 'MAIN_DEPT_CHANGE',
                );
                if (!change) return '';
                return (
                    departmentPathLabel(change.new_department_id, deptById) ??
                    change.new_department?.name ??
                    ''
                );
            },
            renderCell: ({ value }) =>
                value ? (
                    <Tooltip title={value as string}>
                        <span
                            style={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                display: 'block',
                            }}
                        >
                            {value as string}
                        </span>
                    </Tooltip>
                ) : (
                    <Box component="span" sx={{ color: 'text.secondary' }}>—</Box>
                ),
        },
        {
            field: 'status',
            headerName: cfl(getString('status') || 'Status'),
            width: 130,
            renderCell: ({ row }) => {
                const name = row.status?.name ?? '';
                const color = eventStatusColor(name);
                return (
                    <Chip
                        label={cfl(getString(name) || name)}
                        color={color}
                        size="small"
                        variant="outlined"
                    />
                );
            },
        },
        {
            field: 'description',
            headerName: cfl(getString('description') || 'Description'),
            flex: 1,
            minWidth: 160,
            renderCell: ({ value }) =>
                value ? (
                    <Tooltip title={value as string}>
                        <span
                            style={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                display: 'block',
                            }}
                        >
                            {value as string}
                        </span>
                    </Tooltip>
                ) : (
                    <Box component="span" sx={{ color: 'text.secondary' }}>—</Box>
                ),
        },
        {
            field: 'created_at',
            headerName: cfl(getString('createdAt') || 'Created at'),
            width: 160,
            renderCell: ({ value }) =>
                value
                    ? new Date(value as string).toLocaleString('uk-UA', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                      })
                    : '—',
        },
        {
            field: '_actions',
            headerName: '',
            width: 100,
            sortable: false,
            disableColumnMenu: true,
            renderCell: ({ row }) => {
                const isLast = lastEvent?.id === row.id;
                const statusName = row.status?.name ?? '';
                const revertTarget = revertTargetOf(statusName);
                const canRevert = isLast && !!revertTarget;
                return (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, height: '100%' }}>
                        <Tooltip
                            title={
                                !isLast
                                    ? cfl(getString('onlyLastEventRevertable') ||
                                        'Only the latest event can be reverted')
                                    : !revertTarget
                                        ? cfl(getString('nothingToRevert') ||
                                            'Nothing to revert (already a draft)')
                                        : `${cfl(getString('revert') || 'Revert')} → ${cfl(getString(revertTarget) || revertTarget)}`
                            }
                        >
                            <span>
                                <IconButton
                                    size="small"
                                    color="warning"
                                    aria-label={cfl(getString('revert') || 'Revert')}
                                    disabled={!canRevert}
                                    onClick={(e) => handleRevertClick(e, row)}
                                >
                                    <UndoIcon fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip
                            title={
                                isLast
                                    ? cfl(getString('delete') || 'Delete')
                                    : cfl(getString('onlyLastEventDeletable') ||
                                        'Only the latest event (by date) can be deleted')
                            }
                        >
                            <span>
                                <IconButton
                                    size="small"
                                    color="error"
                                    aria-label={cfl(getString('delete') || 'Delete')}
                                    disabled={!isLast}
                                    onClick={(e) => handleDeleteClick(e, row)}
                                >
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>
                    </Box>
                );
            },
        },
    ], [getString, lastEvent, handleDeleteClick, handleRevertClick]);

    // ── Render (no AppShell / breadcrumbs — provided by the card layout) ───────
    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600} sx={{ flex: 1 }}>
                    {cfl(getString('events') || 'Events')}
                </Typography>
                <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={view}
                    onChange={(_, v) => v && setView(v)}
                >
                    <ToggleButton value="grid"><ViewListIcon fontSize="small" /></ToggleButton>
                    <ToggleButton value="cards"><ViewModuleIcon fontSize="small" /></ToggleButton>
                </ToggleButtonGroup>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setCreateOpen(true)}
                >
                    {cfl(getString('addEvent') || 'Add Event')}
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {(error as Error).message}
                </Alert>
            )}

            {!isLoading && !error && events.length === 0 && (
                <Paper sx={{ p: 4, textAlign: 'center' }} variant="outlined">
                    <EventNoteIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography color="text.secondary" mb={2}>
                        {cfl(getString('noEventsYet') || 'No events for this employee yet')}
                    </Typography>
                    <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={() => setCreateOpen(true)}
                    >
                        {cfl(getString('createFirstEvent') || 'Create the first event')}
                    </Button>
                </Paper>
            )}

            {!isLoading && !error && events.length > 0 && view === 'grid' && (
                <DataGrid
                    rows={events}
                    columns={columns}
                    loading={isLoading}
                    autoHeight
                    pageSizeOptions={[25, 50, 100]}
                    initialState={{
                        pagination: { paginationModel: { pageSize: 25 } },
                        sorting: { sortModel: [{ field: 'effective_date', sort: 'desc' }] },
                    }}
                    disableRowSelectionOnClick
                    onRowClick={(params) => setDrawerEvent(params.row as EmployeeEventFlat)}
                    sx={{ ...dataGridSx, '& .MuiDataGrid-row': { cursor: 'pointer' } }}
                    localeText={localeText}
                />
            )}

            {!isLoading && !error && events.length > 0 && view === 'cards' && (
                // Card grid: SAME events as the DataGrid (sorted newest-first), one card
                // per event carrying every grid column; click the body to open the drawer.
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 2 }}>
                    {sortedEvents.map((row) => {
                        const newJob = row.changes?.find((c) => c.direction_type?.code === 'JOB_CHANGE')?.new_job?.name ?? '';
                        const deptChange = row.changes?.find((c) => c.direction_type?.code === 'MAIN_DEPT_CHANGE');
                        const newDept = deptChange
                            ? (departmentPathLabel(deptChange.new_department_id, deptById) ?? deptChange.new_department?.name ?? '')
                            : '';
                        const statusName = row.status?.name ?? '';
                        const isLast = lastEvent?.id === row.id;
                        const revertTarget = revertTargetOf(statusName);
                        const canRevert = isLast && !!revertTarget;
                        return (
                            <Card key={row.id} variant="outlined">
                                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                    <Box sx={{ cursor: 'pointer' }} onClick={() => setDrawerEvent(row as EmployeeEventFlat)}>
                                        <Stack direction="row" alignItems="flex-start" spacing={1}>
                                            <Box sx={{ flex: 1 }}>
                                                <Typography fontSize={14} fontWeight={600}>
                                                    {row.event_type?.name ?? `#${row.event_type_id}`}
                                                </Typography>
                                                <Typography fontSize={12} color="text.secondary">
                                                    {formatToUkrDate(row.effective_date)}
                                                </Typography>
                                            </Box>
                                            {statusName && (
                                                <Chip
                                                    label={cfl(getString(statusName) || statusName)}
                                                    color={eventStatusColor(statusName)}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            )}
                                        </Stack>
                                        <Stack spacing={0.4} sx={{ mt: 1 }}>
                                            {newJob && (
                                                <Typography fontSize={12.5}>
                                                    <Box component="span" sx={{ color: 'text.secondary' }}>{cfl(getString('eventNewJob') || 'New job')}: </Box>
                                                    {newJob}
                                                </Typography>
                                            )}
                                            {newDept && (
                                                <Typography fontSize={12.5}>
                                                    <Box component="span" sx={{ color: 'text.secondary' }}>{cfl(getString('eventNewDepartment') || 'New department')}: </Box>
                                                    {newDept}
                                                </Typography>
                                            )}
                                            {row.description && (
                                                <Typography fontSize={12.5} color="text.secondary">
                                                    {row.description}
                                                </Typography>
                                            )}
                                            <Typography fontSize={11.5} color="text.disabled">
                                                {cfl(getString('createdAt') || 'Created at')}:{' '}
                                                {row.created_at
                                                    ? new Date(row.created_at).toLocaleString('uk-UA', { dateStyle: 'short', timeStyle: 'short' })
                                                    : '—'}
                                            </Typography>
                                        </Stack>
                                    </Box>
                                    <Divider sx={{ my: 1 }} />
                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.25 }}>
                                        <Tooltip
                                            title={
                                                !isLast
                                                    ? cfl(getString('onlyLastEventRevertable') || 'Only the latest event can be reverted')
                                                    : !revertTarget
                                                        ? cfl(getString('nothingToRevert') || 'Nothing to revert (already a draft)')
                                                        : `${cfl(getString('revert') || 'Revert')} → ${cfl(getString(revertTarget) || revertTarget)}`
                                            }
                                        >
                                            <span>
                                                <IconButton
                                                    size="small"
                                                    color="warning"
                                                    aria-label={cfl(getString('revert') || 'Revert')}
                                                    disabled={!canRevert}
                                                    onClick={(e) => handleRevertClick(e, row)}
                                                >
                                                    <UndoIcon fontSize="small" />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                        <Tooltip
                                            title={
                                                isLast
                                                    ? cfl(getString('delete') || 'Delete')
                                                    : cfl(getString('onlyLastEventDeletable') || 'Only the latest event (by date) can be deleted')
                                            }
                                        >
                                            <span>
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    aria-label={cfl(getString('delete') || 'Delete')}
                                                    disabled={!isLast}
                                                    onClick={(e) => handleDeleteClick(e, row)}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                    </Box>
                                </CardContent>
                            </Card>
                        );
                    })}
                </Box>
            )}

            <EmployeeEventCreateDialog
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                onSubmit={handleCreate}
                isPending={createMutation.isPending}
                getString={getString}
                hasAnyEvent={events.length > 0}
                existingDates={events.map((e) => e.effective_date)}
            />
            <EmployeeEventDeleteDialog
                event={eventToDelete}
                isPending={deleteMutation.isPending}
                onConfirm={handleDeleteConfirm}
                onCancel={() => setEventToDelete(null)}
                getString={getString}
            />
            <EmployeeEventRevertDialog
                event={eventToRevert}
                isPending={revertMutation.isPending}
                onConfirm={handleRevertConfirm}
                onCancel={() => setEventToRevert(null)}
                getString={getString}
            />
            <EmployeeEventDrawer
                event={drawerEvent}
                employeeId={employeeId}
                onClose={() => setDrawerEvent(null)}
                getString={getString}
            />
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    severity={snackbar.severity}
                    onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
