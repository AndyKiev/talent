import { Box, Breadcrumbs, Tab, Tabs, Typography } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { Link, Outlet, useLocation } from '@tanstack/react-router';
import AppShell from '../../layout/AppShell';
import { PageContainer } from '../../layout/PageContainer';
import cfl from '../../../utils/helpers.ts';
import useString from '../../../hooks/useString';

// Single sub-screen for now (dimensions); kept as a tabbed layout so more
// recruitment-admin lookups can be added later without restructuring.
const TABS = [
    { to: '/admin/recruitment/dimensions', labelKey: 'recruitmentDimensions', fallback: 'Recruitment dimensions' },
] as const;

export function RecruitmentAdminLayout() {
    const getString = useString();
    const { pathname } = useLocation();
    const active = Math.max(0, TABS.findIndex((t) => pathname.startsWith(t.to)));

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
                        {cfl(getString('recruitment') || 'Recruitment')}
                    </Typography>
                </Breadcrumbs>

                <Tabs value={active} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    {TABS.map((t) => (
                        <Tab key={t.to} component={Link} to={t.to} label={cfl(getString(t.labelKey) || t.fallback)} />
                    ))}
                </Tabs>

                <Box sx={{ pt: 3 }}>
                    <Outlet />
                </Box>
            </PageContainer>
        </AppShell>
    );
}
