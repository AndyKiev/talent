import { useMemo } from "react";
import { Outlet, useNavigate, useParams, useRouterState, Link } from "@tanstack/react-router";
import useString from "../../hooks/useString.ts";
import str from "../../strings/str.ts";
import { useQuery } from "@tanstack/react-query";
import { fetchEmployeeById } from "./employeeApi.ts";
import AppShell from "../layout/AppShell.tsx";
import { PageContainer } from '../layout/PageContainer';
import { Breadcrumbs, Chip, Divider, Paper, Stack, Typography } from "@mui/material";
import { ResponsiveTabs } from "../ui/ResponsiveTabs.tsx";
import type { TabItem } from "../ui/ResponsiveTabs.tsx";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import cfl from "../../utils/helpers.ts";
import { useBooleanSetting } from "../../hooks/useAppSetting";

const STATUS_COLOR: Record<string, 'warning' | 'success' | 'error' | 'default'> = {
    pending: 'warning',
    working: 'success',
    dismissed: 'error',
};

// Departments tab removed — its content now lives inside the Summary tab.
const TAB_VALUES = ['summary', 'events', 'talent_audit', 'missions', 'career_history', 'responsibility_history', 'trainings'];

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

    // Training module master flag: OFF drops the trainings tab entirely.
    const { enabled: trainingModuleOn } = useBooleanSetting('training_module_enabled');

    // Derive active tab from the current path segment.
    const pathname = useRouterState({ select: (s) => s.location.pathname });
    const seg = pathname.split(`/employees/${id}/`)[1]?.split('/')[0] ?? 'summary';
    const activeTab =
        TAB_VALUES.includes(seg) && (seg !== 'trainings' || trainingModuleOn) ? seg : 'summary';

    const goTo = (tab: string) => {
        navigate({
            to: `/employees/$employeeId/${tab}`,
            params: { employeeId: String(id) },
        });
    };

    const statusName = employee?.status?.name ?? '';

    // Build tab definitions with resolved translations.
    const TABS: TabItem[] = useMemo(() => [
        { label: cfl(getString('summary') || 'Summary'), value: 'summary' },
        { label: cfl(getString('events') || 'Events'), value: 'events' },
        { label: cfl(getString('talentAudit') || 'Talent Audit'), value: 'talent_audit' },
        // Development plan (missions + KPIs) — sits next to the talent audit,
        // which is the other forward-looking view of the same person.
        { label: cfl(getString('missions') || 'Missions'), value: 'missions' },
        { label: cfl(getString('careerHistory') || 'Career History'), value: 'career_history' },
        { label: cfl(getString('responsibilityHistory') || 'Responsibility History'), value: 'responsibility_history' },
        ...(trainingModuleOn
            ? [{ label: cfl(getString('trainings') || 'Trainings'), value: 'trainings' }]
            : []),
    ], [getString, trainingModuleOn]);

    return (
        <AppShell>
            <PageContainer>
                {/* ── Breadcrumbs: back to the employees table ─────────────── */}
                <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 1.5 }}>
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
                <Paper variant="outlined" sx={{ p: 1, px: 1.5, mb: 1.5 }}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Typography variant="subtitle1" fontWeight={600}>
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

                {/* ── Tab bar (collapses into hamburger menu on narrow screens) */}
                <Paper variant="outlined" sx={{ mb: 1.5 }}>
                    <ResponsiveTabs
                        tabs={TABS}
                        activeTab={activeTab}
                        onChange={goTo}
                    />
                    <Divider />
                </Paper>

                {/* ── Active tab content ──────────────────────────────────── */}
                <Outlet />
            </PageContainer>
        </AppShell>
    );
}
