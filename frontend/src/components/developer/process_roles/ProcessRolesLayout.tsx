// src/components/developer/process_roles/ProcessRolesLayout.tsx
import React from 'react';
import { Outlet, useRouter, useMatchRoute, Link } from '@tanstack/react-router';
import { Box, Breadcrumbs, Tab, Tabs, Typography } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import AppShell from '../../layout/AppShell';
import { PageContainer } from '../../layout/PageContainer';
import cfl from '../../../utils/capitalizeFirstLetter';
import useString from '../../../hooks/useString';

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
                <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 3 }}>
                    <Link to="/developer" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <Typography variant="body2" color="text.secondary">
                            {cfl(getString('developer'))}
                        </Typography>
                    </Link>
                    <Typography variant="body2" color="text.primary" fontWeight={600}>
                        {cfl(getString('processRolesGroup') || 'Process Roles')}
                    </Typography>
                </Breadcrumbs>

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
