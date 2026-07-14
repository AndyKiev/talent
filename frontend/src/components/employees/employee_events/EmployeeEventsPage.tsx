// src/components/employees/employee_events/EmployeeEventsPage.tsx
import { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Alert,
    Box,
    Button,
    Chip,
    IconButton,
    Paper,
    Snackbar,
    Tooltip,
    Typography,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EventNoteIcon from '@mui/icons-material/EventNote';
import DeleteIcon from '@mui/icons-material/Delete';
import UndoIcon from '@mui/icons-material/Undo';
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

const STATUS_COLORS: Record<string, 'warning' | 'info' | 'success' | 'default'> = {
    draft: 'warning',
    ready: 'info',
    applied: 'success',
};

// Backward step machine, mirrors the backend: applied -> ready -> draft.
// A status absent here (i.e. draft) cannot be reverted further.
const REVERT_TARGET: Record<string, string> = { applied: 'ready', ready: 'draft' };

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
    const columns: GridColDef<EmployeeEventFull>[] = [
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
                const color = STATUS_COLORS[name] ?? 'default';
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
                const revertTarget = REVERT_TARGET[statusName];
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
    ];

    // ── Render (no AppShell / breadcrumbs — provided by the card layout) ───────
    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600} sx={{ flex: 1 }}>
                    {cfl(getString('events') || 'Events')}
                </Typography>
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

            {!isLoading && !error && events.length === 0 ? (
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
            ) : (
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
