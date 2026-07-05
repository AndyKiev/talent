// src/components/employees/CareerHistoryTab.tsx
//
// Explicit job history derived from APPLIED employee events — no need to open
// each event. We replay applied events in chronological order, tracking the
// running job and main department, and emit a row whenever an event changes the
// job and/or the main department. Each row shows:
//   when (effective date) · event · job (prev → new) · where (main top › subordinate)
//
// The top-level (main) department is resolved on the backend via
// /departments/top_org_units (walks up the tree by category key).

import { useMemo } from 'react';
import { useParams } from '@tanstack/react-router';
import { useQuery, useQueries } from '@tanstack/react-query';
import {
    Paper,
    Typography,
    Stack,
    Chip,
    Box,
    Divider,
    CircularProgress,
} from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ArrowRightAltIcon from '@mui/icons-material/ArrowRightAlt';
import WorkHistoryIcon from '@mui/icons-material/WorkHistory';
import {
    fetchEmployeeEvents,
    fetchEmployeeEvent,
    type EmployeeEventFull,
} from './employee_events/employeeEventApi';
import { fetchTopOrgUnits } from './topOrgUnitApi';
import useString from '../../hooks/useString';
import str from '../../strings/str';
import cfl from '../../utils/helpers.ts';
import { formatToUkrDate } from '../../utils/dateFormatter';

interface JobHistoryRow {
    eventId: number;
    date: string;
    eventType: string;
    jobName: string | null;       // job in effect after this event
    prevJobName: string | null;   // only when this event changed the job
    jobChanged: boolean;
    deptId: number | null;        // specific (subordinate) department in effect
    deptName: string | null;
}

export function CareerHistoryTab() {
    const { employeeId } = useParams({ from: '/employees/$employeeId/career_history/' });
    const id = Number(employeeId);
    const getString = useString({ str });

    // 1) All events → keep only APPLIED, oldest first (chronological replay).
    const { data: events = [], isLoading: eventsLoading } = useQuery({
        queryKey: ['employee-events', id],
        queryFn: () => fetchEmployeeEvents(id),
        staleTime: 2 * 60 * 1000,
    });

    const appliedEvents = useMemo(
        () =>
            events
                .filter((e) => e.status?.name === 'applied')
                .sort((a, b) =>
                    a.effective_date === b.effective_date
                        ? a.id - b.id
                        : a.effective_date < b.effective_date ? -1 : 1,
                ),
        [events],
    );

    // 2) Fetch each applied event's full detail (its changes).
    const detailQueries = useQueries({
        queries: appliedEvents.map((e) => ({
            queryKey: ['employee-event-detail', id, e.id],
            queryFn: () => fetchEmployeeEvent(id, e.id),
            staleTime: 2 * 60 * 1000,
        })),
    });

    const detailsLoading = detailQueries.some((q) => q.isLoading);
    const details = detailQueries.map((q) => q.data).filter(Boolean) as EmployeeEventFull[];

    // 3) Replay chronologically, tracking running job + main department.
    const rows = useMemo<JobHistoryRow[]>(() => {
        const byId = new Map(details.map((d) => [d.id, d]));
        let curJobId: number | null = null;
        let curJobName: string | null = null;
        let curDeptId: number | null = null;
        let curDeptName: string | null = null;
        const out: JobHistoryRow[] = [];

        for (const ev of appliedEvents) {
            const full = byId.get(ev.id);
            if (!full) continue;

            const jobChange = full.changes.find((c) => c.direction_type?.code === 'JOB_CHANGE');
            const mainDeptChange = full.changes.find(
                (c) => c.direction_type?.code === 'MAIN_DEPT_CHANGE',
            );

            const prevJobName = curJobName;

            if (mainDeptChange?.new_department) {
                curDeptId = mainDeptChange.new_department.id;
                curDeptName = mainDeptChange.new_department.name;
            }
            if (jobChange?.new_job) {
                curJobId = jobChange.new_job.id;
                curJobName = jobChange.new_job.name;
            }

            // Emit only when something relevant changed in this event.
            if (jobChange || mainDeptChange) {
                out.push({
                    eventId: ev.id,
                    date: ev.effective_date,
                    eventType: ev.event_type?.name ?? `#${ev.event_type_id}`,
                    jobName: curJobName,
                    prevJobName: jobChange ? prevJobName : null,
                    jobChanged: !!jobChange,
                    deptId: curDeptId,
                    deptName: curDeptName,
                });
            }
            void curJobId;
        }

        // Newest first for display.
        return out.reverse();
    }, [appliedEvents, details]);

    // 4) Resolve top-level (main) department for the departments that appear.
    const deptIds = useMemo(() => {
        const set = new Set<number>();
        rows.forEach((r) => r.deptId != null && set.add(r.deptId));
        return Array.from(set);
    }, [rows]);

    const { data: tops = [] } = useQuery({
        queryKey: ['top-org-units', deptIds.join(',')],
        queryFn: () => fetchTopOrgUnits(deptIds),
        enabled: deptIds.length > 0,
        staleTime: 5 * 60 * 1000,
    });
    const topByDept = useMemo(() => {
        const m = new Map<number, { id: number; name: string }>();
        tops.forEach((t) => t.top && m.set(t.department_id, t.top));
        return m;
    }, [tops]);

    if (eventsLoading || detailsLoading) {
        return (
            <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
                <CircularProgress size={24} />
            </Paper>
        );
    }

    if (rows.length === 0) {
        return (
            <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
                <WorkHistoryIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                <Typography color="text.secondary">
                    {cfl(getString('noJobHistory') || 'No job history yet')}
                </Typography>
            </Paper>
        );
    }

    return (
        <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack divider={<Divider />} spacing={2}>
                {rows.map((r) => {
                    const top = r.deptId != null ? topByDept.get(r.deptId) : undefined;
                    return (
                        <Box key={r.eventId}>
                            {/* When + which event */}
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }} flexWrap="wrap">
                                <Typography variant="subtitle2">{formatToUkrDate(r.date)}</Typography>
                                <Chip label={r.eventType} size="small" variant="outlined" />
                            </Stack>

                            {/* Which job (prev → new, or just current) */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', mb: 0.5 }}>
                                <Typography variant="caption" color="text.secondary">
                                    {cfl(getString('job') || 'Job')}:
                                </Typography>
                                {r.jobChanged && r.prevJobName && (
                                    <>
                                        <Chip label={r.prevJobName} size="small" variant="outlined" sx={{ textDecoration: 'line-through', opacity: 0.7 }} />
                                        <ArrowRightAltIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                                    </>
                                )}
                                <Chip label={r.jobName ?? '—'} size="small" color="primary" variant="filled" />
                            </Box>

                            {/* Where (main top › subordinate) */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                                <Typography variant="caption" color="text.secondary">
                                    {cfl(getString('department') || 'Department')}:
                                </Typography>
                                {top && (
                                    <>
                                        <Chip label={top.name} size="small" color="success" variant="filled" />
                                        <ChevronRightIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                                    </>
                                )}
                                <Chip label={r.deptName ?? '—'} size="small" color="success" variant="outlined" />
                            </Box>
                        </Box>
                    );
                })}
            </Stack>
        </Paper>
    );
}
