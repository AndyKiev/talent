// src/components/admin/reviewers/ReviewersLayout.tsx
import React from 'react';
import { Outlet, useRouter, useMatchRoute, Link } from '@tanstack/react-router';
import { Box, Breadcrumbs, Tab, Tabs, Typography } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import cfl from '../../../utils/capitalizeFirstLetter';
import useString from '../../../hooks/useString';

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
            <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 3 }}>
                <Link to="/admin" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <Typography variant="body2" color="text.secondary">
                        {cfl(getString('admin'))}
                    </Typography>
                </Link>
                <Link to="/admin/people_review" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <Typography variant="body2" color="text.secondary">
                        {cfl(getString('peopleReview') || 'People Review')}
                    </Typography>
                </Link>
                <Typography variant="body2" color="text.primary" fontWeight={600}>
                    {cfl(getString('reviewersGroup') || 'Reviewers')}
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
        </Box>
    );
}
