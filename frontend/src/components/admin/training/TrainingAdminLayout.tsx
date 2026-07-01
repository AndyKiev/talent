// src/components/admin/training/TrainingAdminLayout.tsx
import { Box, Breadcrumbs, Tab, Tabs, Typography } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { Link, Outlet, useLocation } from '@tanstack/react-router';
import AppShell from '../../layout/AppShell';
import cfl from '../../../utils/helpers.ts';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';

// Each training-admin sub-screen is its own nested route under
// /admin/training. The tabs are router Links; the active tab is derived
// from the URL. Training Types stays on the top-level /training page.
const TABS = [
    { to: '/admin/training/categories', labelKey: 'trainingCategories', fallback: 'Training Categories' },
    { to: '/admin/training/statuses', labelKey: 'employeeTrainingStatuses', fallback: 'Employee Training Statuses' },
] as const;

export function TrainingAdminLayout() {
    const getString = useString({ str });
    const { pathname } = useLocation();
    const active = Math.max(0, TABS.findIndex((t) => pathname.startsWith(t.to)));

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
                        {cfl(getString('training') || 'Training')}
                    </Typography>
                </Breadcrumbs>

                <Tabs value={active} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    {TABS.map((t) => (
                        <Tab
                            key={t.to}
                            component={Link}
                            to={t.to}
                            label={cfl(getString(t.labelKey) || t.fallback)}
                        />
                    ))}
                </Tabs>

                <Box sx={{ pt: 3 }}>
                    <Outlet />
                </Box>
            </Box>
        </AppShell>
    );
}
