// src/components/admin/employee_events/employee_event_change-dept_types/EmployeeEventChangeDeptTypePage.tsx
import AppShell from '../../../layout/AppShell.tsx';
import { Box, Breadcrumbs, Typography } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { Link } from '@tanstack/react-router';
import { EmployeeEventChangeDeptTypeCrud } from './EmployeeEventChangeDeptTypeCrud.tsx';
import cfl from '../../../../utils/helpers.ts';
import useString from '../../../../hooks/useString.ts';
import str from '../../../../strings/str.ts';

export function EmployeeEventChangeDeptTypePage() {
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
                    <Link to="/admin/employee_events" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <Typography variant="body2" color="text.secondary">
                            {cfl(getString('employeeEvents'))}
                        </Typography>
                    </Link>
                    <Typography variant="body2" color="text.primary" fontWeight={600}>
                        {cfl(getString('employeeEventChangeDeptTypes'))}
                    </Typography>
                </Breadcrumbs>

                <EmployeeEventChangeDeptTypeCrud />
            </Box>
        </AppShell>
    );
}
