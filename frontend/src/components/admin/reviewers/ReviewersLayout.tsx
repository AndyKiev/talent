// src/components/admin/reviewers/ReviewersLayout.tsx
import React from 'react';
import { Outlet, useRouter, useMatchRoute } from '@tanstack/react-router';
import { Box, Tab, Tabs } from '@mui/material';
import cfl from '../../../utils/capitalizeFirstLetter';
import useString from '../../../hooks/useString';
import { PageBreadcrumbs } from '../../ui/PageBreadcrumbs';

const TOP_TABS = [
    { label: 'reviewers', path: '/admin/people_review/reviewers/holders' },
    { label: 'reviewerAssignments', path: '/admin/people_review/reviewers/employees' },
    { label: 'oversightAutoAssignment', path: '/admin/people_review/reviewers/auto_assignment' },
] as const;

export function ReviewersLayout() {
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
        <Box sx={{ maxWidth: 1800, mx: 'auto' }}>
            <PageBreadcrumbs
                items={[
                    { to: '/admin', label: cfl(getString('admin')) },
                    { to: '/admin/people_review', label: cfl(getString('peopleReview') || 'People Review') },
                    { label: cfl(getString('reviewersGroup') || 'Reviewers') },
                ]}
            />

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
        </Box>
    );
}
