// src/components/admin/training/TrainingAdminLayout.tsx
import { Box, Tab, Tabs } from '@mui/material';
import { Link, Outlet, useLocation } from '@tanstack/react-router';
import AppShell from '../../layout/AppShell';
import { PageContainer } from '../../layout/PageContainer';
import cfl from '../../../utils/helpers.ts';
import useString from '../../../hooks/useString';
import { PageBreadcrumbs } from '../../ui/PageBreadcrumbs';

// Each training-admin sub-screen is its own nested route under
// /admin/training. The tabs are router Links; the active tab is derived
// from the URL. Training Types stays on the top-level /training page.
const TABS = [
    { to: '/admin/training/categories', labelKey: 'trainingCategories', fallback: 'Training Categories' },
    { to: '/admin/training/statuses', labelKey: 'employeeTrainingStatuses', fallback: 'Employee Training Statuses' },
] as const;

export function TrainingAdminLayout() {
    const getString = useString();
    const { pathname } = useLocation();
    const active = Math.max(0, TABS.findIndex((t) => pathname.startsWith(t.to)));

    return (
        <AppShell>
            <PageContainer>
                <PageBreadcrumbs
                    items={[
                        { to: '/admin', label: cfl(getString('admin')) },
                        { label: cfl(getString('training') || 'Training') },
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
