// src/routes/admin/employee_events/employee_event_types.tsx
import { createFileRoute } from '@tanstack/react-router';
import { EmployeeEventTypePage } from '../../../../components/admin/employee_events/employee_event_types/EmployeeEventTypePage';

export const Route = createFileRoute('/admin/employee_events/employee_event_types/')({
    component: EmployeeEventTypePage,
});