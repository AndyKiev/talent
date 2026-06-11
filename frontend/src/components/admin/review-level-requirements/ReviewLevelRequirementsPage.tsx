import AppShell from '../../layout/AppShell.tsx';
import { Box, Breadcrumbs, Typography } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { Link } from '@tanstack/react-router';
import useString from '../../../hooks/useString';
import { ReviewLevelRequirementCrud } from './ReviewLevelRequirementCrud.tsx';

export function ReviewLevelRequirementsPage() {
    const getString = useString();
    return (
        <AppShell>
            <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1100, mx: 'auto' }}>
                <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 3 }}>
                    <Link to="/admin" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <Typography variant="body2" color="text.secondary">
                            {getString('admin')}
                        </Typography>
                    </Link>
                    <Typography variant="body2" color="text.primary" fontWeight={600}>
                        {getString('reviewLevelRequirements')}
                    </Typography>
                </Breadcrumbs>

                <ReviewLevelRequirementCrud />
            </Box>
        </AppShell>
    );
}
