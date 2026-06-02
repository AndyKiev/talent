// src/routes/employees/$employeeId/departments/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { DepartmentsTab } from '../../../../components/employees/DepartmentsTab';

export const Route = createFileRoute('/employees/$employeeId/departments/')({
    component: DepartmentsTab,
});