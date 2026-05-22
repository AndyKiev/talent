// src/routes/admin/employee_events/employee-event-statuses/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { EmployeeEventStatusesPage } from '../../../../components/admin/employee_events/employee_event_statuses/EmployeeEventStatusesPage';

export const Route = createFileRoute('/admin/employee_events/employee_event_statuses/')({
  component: EmployeeEventStatusesPage,
});