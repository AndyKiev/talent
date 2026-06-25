// src/components/admin/user_groups/UserGroupsPage.tsx
import AppShell from '../../layout/AppShell';
import { Box, Breadcrumbs, Typography } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { Link } from '@tanstack/react-router';
import { UserGroupCrud } from './UserGroupCrud';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';
import cfl from '../../../utils/capitalizeFirstLetter';

export function UserGroupsPage() {
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
                        {cfl(getString('userGroups'))}
                    </Typography>
                </Breadcrumbs>

                <UserGroupCrud />
            </Box>
        </AppShell>
    );
}