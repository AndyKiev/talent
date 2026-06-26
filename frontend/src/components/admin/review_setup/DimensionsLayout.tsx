// src/components/admin/review_setup/DimensionsLayout.tsx
import React from 'react';
import { Outlet, useRouter, useMatchRoute } from '@tanstack/react-router';
import { Box, Tab, Tabs } from '@mui/material';
import useString from '../../../hooks/useString';

const SUB_TABS = [
    { label: 'reviewDimensions', path: '/admin/people_review/review_setup/dimensions/list' },
    { label: 'criteria', path: '/admin/people_review/review_setup/dimensions/criteria' },
] as const;

export function DimensionsLayout() {
    const getString = useString();
    const router = useRouter();
    const matchRoute = useMatchRoute();

    const activeTab = SUB_TABS.findIndex(({ path }) => matchRoute({ to: path, fuzzy: true }));

    const handleTabChange = (_: React.SyntheticEvent, newIndex: number) => {
        router.navigate({ to: SUB_TABS[newIndex].path });
    };

    return (
        <Box>
            <Tabs
                value={activeTab === -1 ? 0 : activeTab}
                onChange={handleTabChange}
                sx={{ mb: 2.5 }}
            >
                {SUB_TABS.map(({ label }) => (
                    <Tab key={label} label={getString(label)} sx={{ textTransform: 'none' }} />
                ))}
            </Tabs>
            <Outlet />
        </Box>
    );
}
