// src/components/admin/jobs/JobsGroupLayout.tsx
import { Outlet, useRouter, useMatchRoute } from '@tanstack/react-router';
import { Tabs, Tab } from '@mui/material';
import AppShell from '../../layout/AppShell';
import { PageContainer } from '../../layout/PageContainer';
import { PageBreadcrumbs } from '../../ui/PageBreadcrumbs';
import cfl from '../../../utils/helpers.ts';
import useString from '../../../hooks/useString';

const SUB_TABS = [
    { label: 'jobs', path: '/admin/jobs_group/jobs' },
    { label: 'jobGroups', path: '/admin/jobs_group/job_groups' },
    { label: 'jobGroupTypes', path: '/admin/jobs_group/job_group_types' },
    { label: 'jobCategories', path: '/admin/jobs_group/job_categories' },
] as const;

export function JobsGroupLayout() {
    const getString = useString();
    const router = useRouter();
    const matchRoute = useMatchRoute();

    const activeTab = SUB_TABS.findIndex(({ path }) =>
        matchRoute({ to: path, fuzzy: true }),
    );

    const handleTabChange = (_: React.SyntheticEvent, newIndex: number) => {
        router.navigate({ to: SUB_TABS[newIndex].path });
    };

    return (
        <AppShell>
            <PageContainer>
                <PageBreadcrumbs
                    items={[
                        { to: '/admin', label: cfl(getString('admin')) },
                        { label: cfl(getString('jobs') || 'Jobs') },
                    ]}
                />

                <Tabs
                    value={activeTab === -1 ? 0 : activeTab}
                    onChange={handleTabChange}
                    sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
                >
                    {SUB_TABS.map(({ label }) => (
                        <Tab key={label} label={cfl(getString(label) || label)} />
                    ))}
                </Tabs>

                <Outlet />
            </PageContainer>
        </AppShell>
    );
}
