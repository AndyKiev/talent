// src/components/training/TrainingLayout.tsx
import { Box, Breadcrumbs, Tab, Tabs, Typography } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { Link, Outlet, useLocation } from '@tanstack/react-router';
import AppShell from '../layout/AppShell';
import cfl from '../../utils/helpers.ts';
import useString from '../../hooks/useString';
import str from '../../strings/str';

// Training categories/statuses live under /admin/training (admin-managed
// lookups) — this top-level page is Types only.
const TABS = [
    { to: '/training/types', labelKey: 'trainingTypes', fallback: 'Training Types' },
    { to: '/training/state', labelKey: 'trainingState', fallback: 'State' },
] as const;

export function TrainingLayout() {
    const getString = useString({ str });
    const { pathname } = useLocation();
    const active = Math.max(0, TABS.findIndex((t) => pathname.startsWith(t.to)));

    return (
        <AppShell>
            <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1800, mx: 'auto' }}>
                <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 3 }}>
                    <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <Typography variant="body2" color="text.secondary">
                            {cfl(getString('home') || 'Home')}
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
