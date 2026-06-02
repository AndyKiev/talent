// src/components/admin/department_types/DepartmentTypesLayout.tsx
import { Outlet, useRouter, useMatchRoute } from '@tanstack/react-router';
import { Box, Tabs, Tab } from '@mui/material';
import cfl from '../../../utils/helpers.ts';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';

const SUB_TABS = [
    { label: 'list',      path: '/admin/departments_group/department_types/list' },
    { label: 'hierarchy', path: '/admin/departments_group/department_types/hierarchy' },
    { label: 'jobLinks',  path: '/admin/departments_group/department_types/job_links' },
] as const;

export function DepartmentTypesLayout() {
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
        <Box>
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
    );
}
