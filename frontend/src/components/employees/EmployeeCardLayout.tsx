import { Outlet, useNavigate, useParams, useRouterState, Link } from "@tanstack/react-router";
import useString from "../../hooks/useString.ts";
import str from "../../strings/str.ts";
import { useQuery } from "@tanstack/react-query";
import { fetchEmployeeById } from "./employeeApi.ts";
import AppShell from "../layout/AppShell.tsx";
import { Box, Breadcrumbs, Chip, Divider, Paper, Stack, Tab, Tabs, Typography } from "@mui/material";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import cfl from "../../utils/helpers.ts";

const STATUS_COLOR: Record<string, 'warning' | 'success' | 'error' | 'default'> = {
    pending: 'warning',
    working: 'success',
    dismissed: 'error',
};

// Departments tab removed — its content now lives inside the Summary tab.
const TAB_VALUES = ['summary', 'events', 'talent_audit', 'job_history', 'dr_history'];

export function EmployeeCardLayout() {
    const { employeeId } = useParams({ from: '/employees/$employeeId' });
    const id = Number(employeeId);
    const navigate = useNavigate();
    const getString = useString({ str });

    const { data: employee } = useQuery({
        queryKey: ['employee', id],
        queryFn: () => fetchEmployeeById(id),
        staleTime: 5 * 60 * 1000,
    });

    // Derive active tab from the current path segment.
    const pathname = useRouterState({ select: (s) => s.location.pathname });
    const seg = pathname.split(`/employees/${id}/`)[1]?.split('/')[0] ?? 'summary';
    const activeTab = TAB_VALUES.includes(seg) ? seg : 'summary';

    const goTo = (tab: string) => {
        navigate({
            to: `/employees/$employeeId/${tab}`,
            params: { employeeId: String(id) },
        });
    };

    const statusName = employee?.status?.name ?? '';

    return (
        <AppShell>
            <Box sx={{ p: 2 }}>
                {/* ── Breadcrumbs: back to the employees table ─────────────── */}
                <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 2 }}>
                    <Link to="/employees" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <Typography variant="body2" color="text.secondary">
                            {cfl(getString('employees') || 'Employees')}
                        </Typography>
                    </Link>
                    <Typography variant="body2" color="text.primary" fontWeight={600}>
                        {employee?.name ?? `#${id}`}
                    </Typography>
                </Breadcrumbs>

                {/* ── Header card ─────────────────────────────────────────── */}
                <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                    <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                        <Typography variant="h6">
                            {employee?.name ?? `#${id}`}
                        </Typography>
                        <Chip label={employee?.code ?? ''} size="small" variant="outlined" />
                        {statusName && (
                            <Chip
                                label={cfl(getString(statusName) || statusName)}
                                size="small"
                                color={STATUS_COLOR[statusName] ?? 'default'}
                                variant="outlined"
                            />
                        )}
                        {employee?.job?.name && (
                            <Typography variant="body2" color="text.secondary">
                                {employee.job.name}
                            </Typography>
                        )}
                        {employee?.email && (
                            <Typography variant="body2" color="text.secondary">
                                {employee.email}
                            </Typography>
                        )}
                    </Stack>
                </Paper>

                {/* ── Tab bar ─────────────────────────────────────────────── */}
                <Paper variant="outlined" sx={{ mb: 2 }}>
                    <Tabs
                        value={activeTab}
                        onChange={(_, v) => goTo(v)}
                        variant="scrollable"
                        scrollButtons="auto"
                    >
                        <Tab label={cfl(getString('summary') || 'Summary')} value="summary" />
                        <Tab label={cfl(getString('events') || 'Events')} value="events" />
                        <Tab label={cfl(getString('talentAudit') || 'Talent Audit')} value="talent_audit" />
                        <Tab label={cfl(getString('jobHistory') || 'Job History')} value="job_history" />
                        <Tab label={cfl(getString('drHistory') || 'DR History')} value="dr_history" />
                    </Tabs>
                    <Divider />
                </Paper>

                {/* ── Active tab content ──────────────────────────────────── */}
                <Outlet />
            </Box>
        </AppShell>
    );
}
