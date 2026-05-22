// src/routes/admin/employee_events/employee_event_change-dept_types.tsx
import { createFileRoute } from '@tanstack/react-router';
import { EmployeeEventChangeDeptTypePage } from '../../../../components/admin/employee_events/employee_event_change_dept_types/EmployeeEventChangeDeptTypePage';

export const Route = createFileRoute('/admin/employee_events/employee_event_change_dept_types/')({
    component: EmployeeEventChangeDeptTypePage,
});
