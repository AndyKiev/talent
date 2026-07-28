// src/components/admin/employee_events/employee_event_statuses/EmployeeEventStatusesPage.tsx
import AppShell from '../../../layout/AppShell';
import { PageContainer } from '../../../layout/PageContainer';
import { PageBreadcrumbs } from '../../../ui/PageBreadcrumbs';
import { EmployeeEventStatusCrud } from './EmployeeEventStatusCrud';
import useString from '../../../../hooks/useString';
import cfl from '../../../../utils/helpers.ts';

export function EmployeeEventStatusesPage() {
  const getString = useString();

  return (
    <AppShell>
      <PageContainer>
        <PageBreadcrumbs
          items={[
            { to: '/admin', label: cfl(getString('admin') || 'Admin') },
            { to: '/admin/employee_events', label: cfl(getString('employeeEvents') || 'Employee Events') },
            { label: cfl(getString('employeeEventStatuses') || 'Statuses') },
          ]}
        />

        <EmployeeEventStatusCrud />
      </PageContainer>
    </AppShell>
  );
}
