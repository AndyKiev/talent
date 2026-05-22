// src/routes/admin/employee_events/employee_event_direction_types.tsx
import { createFileRoute } from '@tanstack/react-router';
import { EmployeeEventDirectionTypePage } from '../../../../components/admin/employee_events/employee_event_direction_types/EmployeeEventDirectionTypePage';

export const Route = createFileRoute('/admin/employee_events/employee_event_direction_types/')({
    component: EmployeeEventDirectionTypePage,
});
