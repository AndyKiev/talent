// src/components/admin/employee_events/employee_event_direction_types/EmployeeEventDirectionTypePage.tsx
import AppShell from '../../../layout/AppShell.tsx';
import { PageContainer } from '../../../layout/PageContainer';
import { Breadcrumbs, Typography } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { Link } from '@tanstack/react-router';
import { EmployeeEventDirectionTypeCrud } from './EmployeeEventDirectionTypeCrud.tsx';
import cfl from '../../../../utils/helpers.ts';
import useString from '../../../../hooks/useString.ts';
import str from '../../../../strings/str.ts';

export function EmployeeEventDirectionTypePage() {
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
                    <Link to="/admin/employee_events" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <Typography variant="body2" color="text.secondary">
                            {cfl(getString('employeeEvents'))}
                        </Typography>
                    </Link>
                    <Typography variant="body2" color="text.primary" fontWeight={600}>
                        {cfl(getString('employeeEventDirectionTypes'))}
                    </Typography>
                </Breadcrumbs>

                <EmployeeEventDirectionTypeCrud />
            </PageContainer>
        </AppShell>
    );
}
