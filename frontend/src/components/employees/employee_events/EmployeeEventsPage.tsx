// src/components/employees/employee_events/EmployeeEventsPage.tsx
import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { useParams } from '@tanstack/react-router';
import { fetchEmployeeEvents, type EmployeeEventFlat, type EmployeeEventCreate } from './employeeEventApi';
import { employeeEventsQK, useEmployeeEventMutations } from './useEmployeeEventMutations';
import { EmployeeEventDeleteDialog } from './EmployeeEventDeleteDialog';
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

export function EmployeeEventsPage() {
    const { employeeId: employeeIdStr } = useParams({
        from: '/employees/$employeeId/events/',
    });
    const employeeId = Number(employeeIdStr);
    const getString = useString({ str });
    const dataGridSx = useDataGridStyles();
    const localeText = useDataGridLocale();

    const [createOpen, setCreateOpen] = useState(false);
    const [eventToDelete, setEventToDelete] = useState<EmployeeEventFlat | null>(null);
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

    // ── Mutations ─────────────────────────────────────────────────────────────
    const { createMutation, deleteMutation } = useEmployeeEventMutations({
        employeeId,
        setSnackbar,
        onCreateSuccess: () => setCreateOpen(false),
        onDeleteSuccess: () => setEventToDelete(null),
    });

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

    const handleCreate = (payload: EmployeeEventCreate) => {
        createMutation.mutate(payload);
    };

    // ── Columns ───────────────────────────────────────────────────────────────
    const columns: GridColDef<EmployeeEventFlat>[] = [
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
                    <span style={{ color: '#bbb' }}>—</span>
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
            width: 60,
            sortable: false,
            disableColumnMenu: true,
            renderCell: ({ row }) => {
                const isDraft = row.status?.name === 'draft';
                return (
                    <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                        <Tooltip
                            title={
                                isDraft
                                    ? cfl(getString('delete') || 'Delete')
                                    : cfl(getString('appliedCannotDelete') || 'Applied events cannot be deleted')
                            }
                        >
                            <span>
                                <IconButton
                                    size="small"
                                    color="error"
                                    disabled={false}
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
            />
            <EmployeeEventDeleteDialog
                event={eventToDelete}
                isPending={deleteMutation.isPending}
                onConfirm={handleDeleteConfirm}
                onCancel={() => setEventToDelete(null)}
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
