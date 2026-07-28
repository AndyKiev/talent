// src/components/admin/talent/TalentLayout.tsx
import { Box, Tab, Tabs } from '@mui/material';
import { Link, Outlet, useLocation } from '@tanstack/react-router';
import AppShell from '../../layout/AppShell';
import { PageContainer } from '../../layout/PageContainer';
import cfl from '../../../utils/helpers.ts';
import useString from '../../../hooks/useString';
import { PageBreadcrumbs } from '../../ui/PageBreadcrumbs';

// Each talent sub-screen is its own nested route under /admin/talent.
// The tabs are router Links; the active tab is derived from the URL.
const TABS = [
    { to: '/admin/talent/status_period_links', labelKey: 'talentStatusPeriodLinks', fallback: 'Status–Period Links' },
    { to: '/admin/talent/periods', labelKey: 'talentPeriods', fallback: 'Periods' },
    { to: '/admin/talent/statuses', labelKey: 'talentStatuses', fallback: 'Statuses' },
] as const;

export function TalentLayout() {
    const getString = useString();
    const { pathname } = useLocation();
    const active = Math.max(0, TABS.findIndex((t) => pathname.startsWith(t.to)));

    return (
        <AppShell>
            <PageContainer>
                <PageBreadcrumbs
                    items={[
                        { to: '/admin', label: cfl(getString('admin')) },
                        { label: cfl(getString('talent') || 'Talent') },
                    ]}
                />

                <Tabs value={active} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    {TABS.map((t) => (
                        <Tab
                            key={t.to}
                            component={Link}
                            to={t.to}
                            label={cfl(getString(t.labelKey) || t.fallback)}
                        />
                    ))}
                </Tabs>

                <Box sx={{ pt: 3 }}>
                    <Outlet />
                </Box>
            </PageContainer>
        </AppShell>
    );
}
