// src/components/admin/department_categories/DepartmentCategoriesPage.tsx
import AppShell from '../../layout/AppShell.tsx';
import { Box, Breadcrumbs, Typography } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { Link } from '@tanstack/react-router';
import { DepartmentCategoryCrud } from './DepartmentCategoryCrud.tsx';
import cfl from '../../../utils/capitalizeFirstLetter.ts';
import useString from '../../../hooks/useString.ts';
import str from '../../../strings/str.ts';

export function DepartmentCategoriesPage() {
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
                        {cfl(getString('departmentCategories'))}
                    </Typography>
                </Breadcrumbs>

                <DepartmentCategoryCrud />
            </Box>
        </AppShell>
    );
}
