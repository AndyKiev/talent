// src/components/admin/employee_events/employee_event_statuses/EmployeeEventStatusesPage.tsx
import AppShell from '../../../layout/AppShell';
import { PageContainer } from '../../../layout/PageContainer';
import { Breadcrumbs, Typography } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { Link } from '@tanstack/react-router';
import { EmployeeEventStatusCrud } from './EmployeeEventStatusCrud';
import useString from '../../../../hooks/useString';
import str from '../../../../strings/str';
import cfl from '../../../../utils/helpers.ts';

export function EmployeeEventStatusesPage() {
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
      </PageContainer>
    </AppShell>
  );
}
