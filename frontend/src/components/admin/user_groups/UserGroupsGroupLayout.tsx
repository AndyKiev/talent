// src/components/admin/user_groups/UserGroupsGroupLayout.tsx
import { Outlet, useRouter, useLocation } from '@tanstack/react-router';
import { Box, Tab, Tabs } from '@mui/material';
import AppShell from '../../layout/AppShell.tsx';
import { PageContainer } from '../../layout/PageContainer';
import cfl from '../../../utils/helpers.ts';
import useString from '../../../hooks/useString.ts';
import { PageBreadcrumbs } from '../../ui/PageBreadcrumbs';

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
    const getString = useString();
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
                <PageBreadcrumbs
                    items={[
                        { to: '/admin', label: cfl(getString('admin')) },
                        { label: cfl(getString('userGroups') || 'User Groups') },
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
