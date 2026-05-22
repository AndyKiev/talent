// src/routes/admin/employee_events/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { EmployeeEventsPage } from '../../../components/admin/employee_events/EmployeeEventsPage';

export const Route = createFileRoute('/admin/employee_events/')({
  component: EmployeeEventsPage,
});