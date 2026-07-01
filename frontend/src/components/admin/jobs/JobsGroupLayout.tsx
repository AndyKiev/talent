// src/components/admin/jobs/JobsGroupLayout.tsx
import { Outlet, useRouter, useMatchRoute, Link } from '@tanstack/react-router';
import { Box, Tabs, Tab, Breadcrumbs, Typography } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import AppShell from '../../layout/AppShell';
import cfl from '../../../utils/helpers.ts';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';

const SUB_TABS = [
    { label: 'jobs', path: '/admin/jobs_group/jobs' },
    { label: 'jobGroups', path: '/admin/jobs_group/job_groups' },
    { label: 'jobGroupTypes', path: '/admin/jobs_group/job_group_types' },
    { label: 'jobCategories', path: '/admin/jobs_group/job_categories' },
] as const;

export function JobsGroupLayout() {
    const getString = useString({ str });
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
            <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1800, mx: 'auto' }}>
                <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 3 }}>
                    <Link to="/admin" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <Typography variant="body2" color="text.secondary">
                            {cfl(getString('admin'))}
                        </Typography>
                    </Link>
                    <Typography variant="body2" color="text.primary" fontWeight={600}>
                        {cfl(getString('jobs') || 'Jobs')}
                    </Typography>
                </Breadcrumbs>

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
            </Box>
        </AppShell>
    );
}
