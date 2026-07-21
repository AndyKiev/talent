// src/routes/employees/$employeeId/missions/index.tsx
//
// File-based TanStack route for the Missions tab (the employee-scoped
// development plan). Thin by convention — the UI lives in components/.
import { createFileRoute } from '@tanstack/react-router';
import { EmployeeMissionsTab } from '../../../../components/employees/EmployeeMissionsTab';

export const Route = createFileRoute('/employees/$employeeId/missions/')({
    component: EmployeeMissionsTab,
});
