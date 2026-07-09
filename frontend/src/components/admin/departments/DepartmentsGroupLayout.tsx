// src/components/admin/departments/DepartmentsGroupLayout.tsx
import { Outlet, useRouter, useMatchRoute } from '@tanstack/react-router';
import { Box, Breadcrumbs, Tab, Tabs, Typography } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { Link } from '@tanstack/react-router';
import AppShell from '../../layout/AppShell';
import { PageContainer } from '../../layout/PageContainer';
import cfl from '../../../utils/helpers.ts';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';

const TOP_TABS = [
    { label: 'departmentCategories', path: '/admin/departments_group/department_categories' },
    { label: 'structure',            path: '/admin/departments_group/structure' },
    { label: 'departmentTypes',      path: '/admin/departments_group/department_types' },
    { label: 'regions',              path: '/admin/departments_group/regions' },
] as const;

export function DepartmentsGroupLayout() {
    const getString = useString({ str });
    const router = useRouter();
    const matchRoute = useMatchRoute();

    // Resolve active tab index by checking which path is currently matched
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
                    <Link to="/admin" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <Typography variant="body2" color="text.secondary">
                            {cfl(getString('admin'))}
                        </Typography>
                    </Link>
                    <Typography variant="body2" color="text.primary" fontWeight={600}>
                        {cfl(getString('departments') || 'Departments')}
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
