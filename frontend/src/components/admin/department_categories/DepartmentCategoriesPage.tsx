// src/components/admin/department_categories/DepartmentCategoriesPage.tsx
import AppShell from '../../layout/AppShell.tsx';
import { PageContainer } from '../../layout/PageContainer';
import { Breadcrumbs, Typography } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { Link } from '@tanstack/react-router';
import { DepartmentCategoryCrud } from './DepartmentCategoryCrud.tsx';
import cfl from '../../../utils/helpers.ts';
import useString from '../../../hooks/useString.ts';
import str from '../../../strings/str.ts';

export function DepartmentCategoriesPage() {
    const getString = useString({ str });
    return (
        <AppShell>
            <PageContainer>
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
            </PageContainer>
        </AppShell>
    );
}
