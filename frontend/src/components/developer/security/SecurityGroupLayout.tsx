// src/components/developer/security/SecurityGroupLayout.tsx
import { Outlet, useRouter, useLocation } from '@tanstack/react-router';
import { Box, Tab, Tabs } from '@mui/material';
import AppShell from '../../layout/AppShell.tsx';
import { PageContainer } from '../../layout/PageContainer';
import cfl from '../../../utils/helpers.ts';
import useString from '../../../hooks/useString.ts';
import React from "react";
import { PageBreadcrumbs } from '../../ui/PageBreadcrumbs';

const ROOT = '/developer/security';

const TOP_TABS = [
    { label: 'userGroups',          segment: 'user_groups' },
    { label: 'userGroupPermissions',                segment: 'oesl' },
    { label: 'userGroupTypes',      segment: 'user_group_types' },
    { label: 'permissionMatrix',    segment: 'permission_matrix' },
    { label: 'permissionsOverview', segment: 'permissions_overview' },
    { label: 'menus',               segment: 'menus' },
];

export function SecurityGroupLayout() {
    const getString = useString();
    const router = useRouter();
    const location = useLocation();

    const rest = location.pathname.replace(ROOT, '').replace(/^\/+/, '');
    const currentSegment = rest.split('/')[0] || 'user_groups';
    const foundIndex = TOP_TABS.findIndex((t) => t.segment === currentSegment);
    const activeTab = foundIndex === -1 ? 0 : foundIndex;

    const handleTabChange = async (_: React.SyntheticEvent, newIndex: number) => {
        await router.navigate({ to: `${ROOT}/${TOP_TABS[newIndex].segment}` });
    };

    return (
        <AppShell>
            <PageContainer>
                <PageBreadcrumbs
                    items={[
                        { to: '/developer', label: cfl(getString('devPanel') || 'Developer') },
                        { label: cfl(getString('security') || 'Security') },
                    ]}
                />

                <Tabs
                    value={activeTab}
                    onChange={handleTabChange}
                    variant="scrollable"
                    scrollButtons="auto"
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
