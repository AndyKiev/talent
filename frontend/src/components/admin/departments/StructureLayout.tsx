// src/components/admin/departments/StructureLayout.tsx
//
// Sub-tabs of the Structure tab: the editable tree and the organigram.
import { Outlet, useRouter, useMatchRoute } from '@tanstack/react-router';
import { Box, Tab, Tabs } from '@mui/material';
import cfl from '../../../utils/helpers.ts';
import useString from '../../../hooks/useString';

const SUB_TABS = [
    { label: 'structureTreeTab', path: '/admin/departments_group/structure' },
    { label: 'deptTypeOrgTab', path: '/admin/departments_group/structure/organigram' },
] as const;

export function StructureLayout() {
    const getString = useString();
    const router = useRouter();
    const matchRoute = useMatchRoute();

    // The tree tab is the parent path itself, so it must match exactly.
    const activeTab = matchRoute({ to: SUB_TABS[1].path, fuzzy: true }) ? 1 : 0;

    return (
        <Box>
            <Tabs
                value={activeTab}
                onChange={(_, i: number) => router.navigate({ to: SUB_TABS[i].path })}
                sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
            >
                {SUB_TABS.map(({ label }) => (
                    <Tab key={label} label={cfl(getString(label))} />
                ))}
            </Tabs>
            <Outlet />
        </Box>
    );
}
