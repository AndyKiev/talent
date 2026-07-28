// src/components/developer/process_roles/ProcessRolesLayout.tsx
import React from 'react';
import { Outlet, useRouter, useMatchRoute } from '@tanstack/react-router';
import { Box, Tab, Tabs } from '@mui/material';
import AppShell from '../../layout/AppShell';
import { PageContainer } from '../../layout/PageContainer';
import cfl from '../../../utils/capitalizeFirstLetter';
import useString from '../../../hooks/useString';
import { PageBreadcrumbs } from '../../ui/PageBreadcrumbs';

const TOP_TABS = [
    { label: 'processes', path: '/developer/process_roles/process' },
    { label: 'processRoles', path: '/developer/process_roles/process_role' },
] as const;

export function ProcessRolesLayout() {
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
                        { to: '/developer', label: cfl(getString('developer')) },
                        { label: cfl(getString('processRolesGroup') || 'Process Roles') },
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
