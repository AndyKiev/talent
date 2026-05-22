// src/components/admin/employee_events/employee_event_statuses/EmployeeEventStatusesPage.tsx
import AppShell from '../../../layout/AppShell';
import { Box, Breadcrumbs, Typography } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { Link } from '@tanstack/react-router';
import { EmployeeEventStatusCrud } from './EmployeeEventStatusCrud';
import useString from '../../../../hooks/useString';
import str from '../../../../strings/str';
import cfl from '../../../../utils/capitalizeFirstLetter';

export function EmployeeEventStatusesPage() {
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
              {cfl(getString('admin') || 'Admin')}
            </Typography>
          </Link>
          <Link to="/admin/employee_events" style={{ textDecoration: 'none', color: 'inherit' }}>
            <Typography variant="body2" color="text.secondary">
              {cfl(getString('employeeEvents') || 'Employee Events')}
            </Typography>
          </Link>
          <Typography variant="body2" color="text.primary" fontWeight={600}>
            {cfl(getString('employeeEventStatuses') || 'Statuses')}
          </Typography>
        </Breadcrumbs>

        <EmployeeEventStatusCrud />
      </Box>
    </AppShell>
  );
}
