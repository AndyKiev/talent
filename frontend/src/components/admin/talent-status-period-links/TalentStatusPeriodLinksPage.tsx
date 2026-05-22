// src/components/admin/talent-status-period-links/TalentStatusPeriodLinksPage.tsx
import AppShell from '../../layout/AppShell';
import { Box, Breadcrumbs, Typography } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { Link } from '@tanstack/react-router';
import { TalentStatusPeriodLinkCrud } from './TalentStatusPeriodLinkCrud';
import cfl from '../../../utils/capitalizeFirstLetter';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';

export function TalentStatusPeriodLinksPage() {
    const getString = useString({ str });

    return (
        <AppShell>
            <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1100, mx: 'auto' }}>
                <Breadcrumbs
                    separator={<NavigateNextIcon fontSize="small" />}
                    sx={{ mb: 3 }}
                >
                    <Link to="/admin" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <Typography variant="body2" color="text.secondary">
                            {cfl(getString('admin'))}
                        </Typography>
                    </Link>
                    <Typography variant="body2" color="text.primary" fontWeight={600}>
                        {getString('talentStatusPeriodLinks') || 'Status–Period Links'}
                    </Typography>
                </Breadcrumbs>

                <TalentStatusPeriodLinkCrud />
            </Box>
        </AppShell>
    );
}