// src/components/admin/planning_setup/PlanningSetupLayout.tsx
import React from 'react';
import { Outlet, useRouter, useMatchRoute } from '@tanstack/react-router';
import { Box, Tab, Tabs } from '@mui/material';
import AppShell from '../../layout/AppShell';
import { PageContainer } from '../../layout/PageContainer';
import cfl from '../../../utils/helpers.ts';
import useString from '../../../hooks/useString';
import { PageBreadcrumbs } from '../../ui/PageBreadcrumbs';

const TOP_TABS = [
    { label: 'planSessionStatuses', path: '/admin/planning_setup/plan_session_status' },
    { label: 'planCategoryDefaults', path: '/admin/planning_setup/plan_category_defaults' },
    { label: 'planScopeDefaults', path: '/admin/planning_setup/plan_scope_defaults' },
] as const;

export function PlanningSetupLayout() {
    const getString = useString();
    const router = useRouter();
    const matchRoute = useMatchRoute();

    const activeTab = TOP_TABS.findIndex(({ path }) =>
        matchRoute({ to: path, fuzzy: true }),
    );

    const handleTabChange = (_: React.SyntheticEvent, newIndex: number) => {
        router.navigate({ to: TOP_TABS[newIndex].path });
    };

    return (
        <AppShell>
            <PageContainer>
                <PageBreadcrumbs
                    items={[
                        { to: '/admin', label: cfl(getString('admin')) },
                        { label: cfl(getString('planningSetup') || 'Planning Setup') },
                    ]}
                />

                <Tabs
                    value={activeTab === -1 ? 0 : activeTab}
                    onChange={handleTabChange}
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                    {TOP_TABS.map(({ label }) => (
                        <Tab key={label} label={cfl(getString(label) || label)} />
                    ))}
                </Tabs>

                <Box sx={{ pt: 3 }}>
                    <Outlet />
                </Box>
            </PageContainer>
        </AppShell>
    );
}
