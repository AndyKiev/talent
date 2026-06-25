// src/components/admin/talent/TalentLayout.tsx
import { Box, Breadcrumbs, Tab, Tabs, Typography } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { Link, Outlet, useLocation } from '@tanstack/react-router';
import AppShell from '../../layout/AppShell';
import cfl from '../../../utils/helpers.ts';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';

// Each talent sub-screen is its own nested route under /admin/talent.
// The tabs are router Links; the active tab is derived from the URL.
const TABS = [
    { to: '/admin/talent/status_period_links', labelKey: 'talentStatusPeriodLinks', fallback: 'Status–Period Links' },
    { to: '/admin/talent/periods', labelKey: 'talentPeriods', fallback: 'Periods' },
    { to: '/admin/talent/statuses', labelKey: 'talentStatuses', fallback: 'Statuses' },
] as const;

export function TalentLayout() {
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
                        {cfl(getString('talent') || 'Talent')}
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
