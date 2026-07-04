// src/components/admin/departments/DepartmentDetailPage.tsx
import AppShell from '../../layout/AppShell';
import { Box, Breadcrumbs, Typography } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { Link } from '@tanstack/react-router';
import { DepartmentTree } from './DepartmentTree';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';
import cfl from '../../../utils/helpers.ts';

interface Props {
    departmentId: number;
}

export function DepartmentDetailPage({ departmentId }: Props) {
    const getString = useString({ str });

    return (
        <AppShell>
            <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1200, mx: 'auto' }}>
                {/* Breadcrumbs */}
                <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 3 }}>
                    <Link to="/admin" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <Typography variant="body2" color="text.secondary">
                            {cfl(getString('admin') || 'Admin')}
                        </Typography>
                    </Link>
                    <Link to="/admin/structure" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <Typography variant="body2" color="text.secondary">
                            {cfl(getString('structure') || 'Structure')}
                        </Typography>
                    </Link>
                    <Typography variant="body2" color="text.primary" fontWeight={600}>
                        #{departmentId}
                    </Typography>
                </Breadcrumbs>

                <DepartmentTree selectedId={departmentId} />
            </Box>
        </AppShell>
    );
}
