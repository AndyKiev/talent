// src/components/admin/user_groups/UserGroupsGroupLayout.tsx
import { Outlet, useRouter, useLocation, Link } from '@tanstack/react-router';
import { Box, Breadcrumbs, Tab, Tabs, Typography } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import AppShell from '../../layout/AppShell.tsx';
import { PageContainer } from '../../layout/PageContainer';
import cfl from '../../../utils/helpers.ts';
import useString from '../../../hooks/useString.ts';
import str from '../../../strings/str.ts';

const ROOT = '/admin/user_groups_group';

// Moved to developer:
//   user_groups, user_group_types, permission_matrix, permissions_overview -> "security" card
//   permissions (oesl)                                                      -> "security" card (oesl tab)
//   operations, essences                                                    -> "catalog" card
const TOP_TABS = [
    { label: 'users',     segment: 'users' },
    { label: 'hrmScopes', segment: 'hrm_scopes' },
];

export function UserGroupsGroupLayout() {
    const getString = useString({ str });
    const router = useRouter();
    const location = useLocation();

    const rest = location.pathname.replace(ROOT, '').replace(/^\/+/, '');
    const currentSegment = rest.split('/')[0] || 'users';
    const foundIndex = TOP_TABS.findIndex((t) => t.segment === currentSegment);
    const activeTab = foundIndex === -1 ? 0 : foundIndex;

    const handleTabChange = (_: React.SyntheticEvent, newIndex: number) => {
        router.navigate({ to: `${ROOT}/${TOP_TABS[newIndex].segment}` });
    };

    return (
        <AppShell>
            <PageContainer>
                <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 3 }}>
                    <Link to="/admin" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <Typography variant="body2" color="text.secondary">
                            {cfl(getString('admin'))}
                        </Typography>
                    </Link>
                    <Typography variant="body2" color="text.primary" fontWeight={600}>
                        {cfl(getString('userGroups') || 'User Groups')}
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
            </PageContainer>
        </AppShell>
    );
}