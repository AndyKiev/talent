// src/routes/employees/$employeeId/events/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { EmployeeEventsPage } from '../../../../components/employees/employee_events/EmployeeEventsPage';

export const Route = createFileRoute('/employees/$employeeId/events/')({
    component: EmployeeEventsPage,
});