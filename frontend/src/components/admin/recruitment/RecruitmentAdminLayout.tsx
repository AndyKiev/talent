import { Box, Tab, Tabs } from '@mui/material';
import { Link, Outlet, useLocation } from '@tanstack/react-router';
import AppShell from '../../layout/AppShell';
import { PageContainer } from '../../layout/PageContainer';
import cfl from '../../../utils/helpers.ts';
import useString from '../../../hooks/useString';
import { PageBreadcrumbs } from '../../ui/PageBreadcrumbs';

// Single sub-screen for now (dimensions); kept as a tabbed layout so more
// recruitment-admin lookups can be added later without restructuring.
const TABS = [
    { to: '/admin/recruitment/dimensions', labelKey: 'recruitmentDimensions', fallback: 'Recruitment dimensions' },
    { to: '/admin/recruitment/sources', labelKey: 'candidateSources', fallback: 'Candidate sources' },
] as const;

export function RecruitmentAdminLayout() {
    const getString = useString();
    const { pathname } = useLocation();
    const active = Math.max(0, TABS.findIndex((t) => pathname.startsWith(t.to)));

    return (
        <AppShell>
            <PageContainer>
                <PageBreadcrumbs
                    items={[
                        { to: '/admin', label: cfl(getString('admin')) },
                        { label: cfl(getString('recruitment') || 'Recruitment') },
                    ]}
                />

                <Tabs value={active} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    {TABS.map((t) => (
                        <Tab key={t.to} component={Link} to={t.to} label={cfl(getString(t.labelKey) || t.fallback)} />
                    ))}
                </Tabs>

                <Box sx={{ pt: 3 }}>
                    <Outlet />
                </Box>
            </PageContainer>
        </AppShell>
    );
}
