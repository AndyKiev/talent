// src/components/training/TrainingLayout.tsx
import { Box, Breadcrumbs, Tab, Tabs, Typography } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { Link, Navigate, Outlet, useLocation } from '@tanstack/react-router';
import AppShell from '../layout/AppShell';
import { PageContainer } from '../layout/PageContainer';
import cfl from '../../utils/helpers.ts';
import useString from '../../hooks/useString';
import str from '../../strings/str';
import { useBooleanSetting } from '../../hooks/useAppSetting';

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

    // Training module master flag: OFF hides the menu item server-side, so a
    // direct /training URL just redirects home (nothing while still loading).
    const { enabled: trainingModuleOn, isLoading: settingLoading } = useBooleanSetting('training_module_enabled');
    if (settingLoading) return null;
    if (!trainingModuleOn) return <Navigate to="/" replace />;

    return (
        <AppShell>
            <PageContainer>
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
            </PageContainer>
        </AppShell>
    );
}
