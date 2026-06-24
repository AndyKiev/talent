// src/components/developer/security/SecurityGroupLayout.tsx
import { Outlet, useRouter, useLocation, Link } from '@tanstack/react-router';
import { Box, Breadcrumbs, Tab, Tabs, Typography } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import AppShell from '../../layout/AppShell.tsx';
import cfl from '../../../utils/helpers.ts';
import useString from '../../../hooks/useString.ts';
import str from '../../../strings/str.ts';
import React from "react";

const ROOT = '/developer/security';

const TOP_TABS = [
    { label: 'userGroups',          segment: 'user_groups' },
    { label: 'userGroupPermissions',                segment: 'oesl' },
    { label: 'userGroupTypes',      segment: 'user_group_types' },
    { label: 'permissionMatrix',    segment: 'permission_matrix' },
    { label: 'permissionsOverview', segment: 'permissions_overview' },
];

export function SecurityGroupLayout() {
    const getString = useString({ str });
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
            <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1400, mx: 'auto' }}>
                <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 3 }}>
                    <Link to="/developer" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <Typography variant="body2" color="text.secondary">
                            {cfl(getString('devPanel') || 'Developer')}
                        </Typography>
                    </Link>
                    <Typography variant="body2" color="text.primary" fontWeight={600}>
                        {cfl(getString('security') || 'Security')}
                    </Typography>
                </Breadcrumbs>

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
            </Box>
        </AppShell>
    );
}
